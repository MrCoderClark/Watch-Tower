export interface TransactionAgg {
  name: string;
  op: string;
  count: number;
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
  error_rate: number;
}

export interface SpanRow {
  span_id: string;
  parent_span_id: string | null;
  op: string;
  description: string | null;
  started_at: string;
  ended_at: string;
  duration_ms: number;
  data: Record<string, unknown>;
}

export interface TransactionDetail {
  id: string;
  trace_id: string;
  transaction_id: string;
  name: string;
  op: string;
  status: string;
  environment: string;
  release: string | null;
  started_at: string;
  ended_at: string;
  duration_ms: number;
  tags: Record<string, unknown>;
  measurements: Record<string, unknown>;
  spans: SpanRow[];
}

export interface SlowTransactionRow {
  id: string;
  duration_ms: number;
  status: string;
  started_at: string;
}
