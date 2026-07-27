import type { AuthResponse, LoginInput, SignupInput, User } from "@/types/auth";
import type {
  FrequencyResponse,
  IssueListParams,
  IssueListResponse,
  ProjectSummary,
} from "@/types/issues";
import type {
  ProjectKey,
  ProjectKeyCreated,
  ProjectKeyCreateInput,
} from "@/types/keys";
import type {
  Org,
  Project,
  ProjectCreateInput,
} from "@/types/workspace";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export class ApiError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  accessToken?: string | null,
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  if (!res.ok) {
    const detail = await res
      .json()
      .then((b) => b?.detail ?? res.statusText)
      .catch(() => res.statusText);
    throw new ApiError(res.status, typeof detail === "string" ? detail : "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  signup: (input: SignupInput) =>
    request<AuthResponse>("/api/v1/auth/signup", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  login: (input: LoginInput) =>
    request<AuthResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  refresh: () =>
    request<AuthResponse>("/api/v1/auth/refresh", {
      method: "POST",
    }),

  logout: () =>
    request<void>("/api/v1/auth/logout", {
      method: "POST",
    }),

  me: (accessToken: string) =>
    request<User>("/api/v1/auth/me", { method: "GET" }, accessToken),

  listOrgs: (accessToken: string) =>
    request<Org[]>("/api/v1/orgs", { method: "GET" }, accessToken),

  listProjects: (accessToken: string, orgSlug: string) =>
    request<Project[]>(
      `/api/v1/orgs/${orgSlug}/projects`,
      { method: "GET" },
      accessToken,
    ),

  createProject: (
    accessToken: string,
    orgSlug: string,
    input: ProjectCreateInput,
  ) =>
    request<Project>(
      `/api/v1/orgs/${orgSlug}/projects`,
      { method: "POST", body: JSON.stringify(input) },
      accessToken,
    ),

  listIssues: (
    accessToken: string,
    projectSlug: string,
    params: IssueListParams = {},
  ) => {
    const search = new URLSearchParams();
    if (params.status) search.set("status", params.status);
    if (params.q) search.set("q", params.q);
    if (params.cursor) search.set("cursor", params.cursor);
    if (params.limit) search.set("limit", String(params.limit));
    const qs = search.toString();
    return request<IssueListResponse>(
      `/api/v1/projects/${projectSlug}/issues${qs ? `?${qs}` : ""}`,
      { method: "GET" },
      accessToken,
    );
  },

  projectSummary: (accessToken: string, projectSlug: string) =>
    request<ProjectSummary>(
      `/api/v1/projects/${projectSlug}/summary`,
      { method: "GET" },
      accessToken,
    ),

  projectFrequency: (
    accessToken: string,
    projectSlug: string,
    range: "24h" | "7d" | "30d" = "24h",
  ) =>
    request<FrequencyResponse>(
      `/api/v1/projects/${projectSlug}/frequency?range=${range}`,
      { method: "GET" },
      accessToken,
    ),

  listKeys: (accessToken: string, projectSlug: string) =>
    request<ProjectKey[]>(
      `/api/v1/projects/${projectSlug}/keys`,
      { method: "GET" },
      accessToken,
    ),

  createKey: (
    accessToken: string,
    projectSlug: string,
    input: ProjectKeyCreateInput,
  ) =>
    request<ProjectKeyCreated>(
      `/api/v1/projects/${projectSlug}/keys`,
      { method: "POST", body: JSON.stringify(input) },
      accessToken,
    ),

  revokeKey: (accessToken: string, projectSlug: string, keyId: string) =>
    request<void>(
      `/api/v1/projects/${projectSlug}/keys/${keyId}`,
      { method: "DELETE" },
      accessToken,
    ),
};
