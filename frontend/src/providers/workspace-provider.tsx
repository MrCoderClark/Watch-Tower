"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { api } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import type { ProjectSummary } from "@/types/issues";
import type { Org, Project, ProjectCreateInput } from "@/types/workspace";

const CURRENT_PROJECT_KEY = "wt.current_project_slug";

type WorkspaceState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      orgs: Org[];
      currentOrg: Org;
      projects: Project[];
      currentProject: Project | null;
      summary: ProjectSummary | null;
    };

type WorkspaceContextValue = WorkspaceState & {
  setCurrentProject: (slug: string) => void;
  createProject: (input: ProjectCreateInput) => Promise<Project>;
  reload: () => Promise<void>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { status: authStatus, accessToken } = useAuth();
  const [state, setState] = useState<WorkspaceState>({ status: "loading" });

  const load = useCallback(async () => {
    if (authStatus !== "authenticated" || !accessToken) return;
    setState({ status: "loading" });
    try {
      const orgs = await api.listOrgs(accessToken);
      if (orgs.length === 0) {
        setState({ status: "error", message: "No organization found" });
        return;
      }
      const currentOrg = orgs[0];
      const projects = await api.listProjects(accessToken, currentOrg.slug);
      const savedSlug =
        typeof window !== "undefined"
          ? window.localStorage.getItem(CURRENT_PROJECT_KEY)
          : null;
      const currentProject =
        projects.find((p) => p.slug === savedSlug) ?? projects[0] ?? null;
      let summary: ProjectSummary | null = null;
      if (currentProject) {
        try {
          summary = await api.projectSummary(accessToken, currentProject.slug);
        } catch {
          summary = null;
        }
      }
      setState({
        status: "ready",
        orgs,
        currentOrg,
        projects,
        currentProject,
        summary,
      });
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "Failed to load workspace",
      });
    }
  }, [authStatus, accessToken]);

  useEffect(() => {
    if (authStatus === "authenticated") void load();
  }, [authStatus, load]);

  const setCurrentProject = useCallback(
    (slug: string) => {
      setState((prev) => {
        if (prev.status !== "ready") return prev;
        const next = prev.projects.find((p) => p.slug === slug);
        if (!next) return prev;
        if (typeof window !== "undefined") {
          window.localStorage.setItem(CURRENT_PROJECT_KEY, slug);
        }
        return { ...prev, currentProject: next, summary: null };
      });
      // Refresh the summary for the newly-selected project.
      if (accessToken) {
        api
          .projectSummary(accessToken, slug)
          .then((summary) => {
            setState((prev) =>
              prev.status === "ready" && prev.currentProject?.slug === slug
                ? { ...prev, summary }
                : prev,
            );
          })
          .catch(() => {});
      }
    },
    [accessToken],
  );

  const createProject = useCallback(
    async (input: ProjectCreateInput): Promise<Project> => {
      if (state.status !== "ready" || !accessToken) {
        throw new Error("Workspace not ready");
      }
      const project = await api.createProject(
        accessToken,
        state.currentOrg.slug,
        input,
      );
      setState((prev) => {
        if (prev.status !== "ready") return prev;
        return {
          ...prev,
          projects: [...prev.projects, project],
          currentProject: project,
          summary: null,
        };
      });
      if (typeof window !== "undefined") {
        window.localStorage.setItem(CURRENT_PROJECT_KEY, project.slug);
      }
      return project;
    },
    [state, accessToken],
  );

  const value = useMemo<WorkspaceContextValue>(
    () => ({ ...state, setCurrentProject, createProject, reload: load }),
    [state, setCurrentProject, createProject, load],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (ctx === null)
    throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
}
