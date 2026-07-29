export type ProjectKeyKind = "public" | "secret";

export type ProjectKey = {
  id: string;
  kind: ProjectKeyKind;
  key_prefix: string;
  label: string | null;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

export type ProjectKeyCreated = ProjectKey & {
  plaintext: string;
};

export type ProjectKeyCreateInput = {
  kind: ProjectKeyKind;
  label?: string;
};
