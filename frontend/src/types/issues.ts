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

export type Frame = {
  function: string | null;
  module: string | null;
  filename: string | null;
  abs_path: string | null;
  lineno: number | null;
  colno: number | null;
  context_line: string | null;
  pre_context: string[];
  post_context: string[];
  in_app: boolean | null;
};

export type Stacktrace = {
  frames: Frame[];
};

export type ExceptionInfo = {
  type: string;
  value: string | null;
  module: string | null;
  stacktrace: Stacktrace | null;
};

export type BreadcrumbEntry = {
  timestamp: string | null;
  type: string | null;
  category: string | null;
  level: string | null;
  message: string | null;
  data: Record<string, unknown> | null;
};

export type EventOut = {
  id: string;
  event_id: string;
  occurred_at: string;
  received_at: string;
  environment: string;
  release: string | null;
  platform: string;
  sdk_name: string | null;
  sdk_version: string | null;
  level: Level;
  message: string | null;
  exception: ExceptionInfo | null;
  request: Record<string, unknown> | null;
  user: Record<string, unknown> | null;
  tags: Record<string, unknown>;
  contexts: Record<string, unknown>;
  breadcrumbs: BreadcrumbEntry[];
  attachments: Record<string, unknown>[];
  browser_name: string | null;
  browser_version: string | null;
  os_name: string | null;
  os_version: string | null;
};

export type IssueDetail = Issue & { sample_event: EventOut | null };

export type IssueUpdate = { status: "unresolved" | "resolved" | "ignored" };
