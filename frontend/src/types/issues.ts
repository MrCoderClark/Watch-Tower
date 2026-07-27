export type IssueStatus = "unresolved" | "resolved" | "ignored" | "regressed";
export type Level = "debug" | "info" | "warning" | "error" | "fatal";

export type Issue = {
  id: string;
  fingerprint: string;
  title: string;
  culprit: string | null;
  level: Level;
  status: IssueStatus;
  first_seen_at: string;
  last_seen_at: string;
  event_count: number;
  user_count: number;
};

export type IssueListResponse = {
  items: Issue[];
  next_cursor: string | null;
};

export type ProjectSummary = {
  unresolved_count: number;
  events_24h: number;
  affected_users_24h: number;
  unique_issues_24h: number;
};

export type FrequencyPoint = {
  t: string;
  count: number;
};

export type FrequencyResponse = {
  range: string;
  interval: "hour" | "day";
  points: FrequencyPoint[];
};

export type IssueListParams = {
  status?: string;
  q?: string;
  cursor?: string;
  limit?: number;
};
