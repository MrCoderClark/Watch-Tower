export interface LogRow {
  id: string;
  occurred_at: string;
  level: string;
  service: string | null;
  message: string;
  attributes: Record<string, unknown>;
  trace_id: string | null;
  span_id: string | null;
}

export interface LogListParams {
  q?: string;
  level?: string;
  service?: string;
  trace_id?: string;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
}

export interface LogListResponse {
  items: LogRow[];
  next_cursor: string | null;
}
