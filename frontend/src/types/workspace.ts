export type Org = {
  id: string;
  slug: string;
  name: string;
  plan: string;
  role: "owner" | "admin" | "member" | "viewer";
  created_at: string;
};

export type Project = {
  id: string;
  slug: string;
  name: string;
  platform: string;
  organization_id: string;
  team_id: string | null;
  created_at: string;
};

export type ProjectCreateInput = {
  name: string;
  platform: string;
};
