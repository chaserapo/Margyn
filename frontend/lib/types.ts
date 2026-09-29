export type JobStatus = 'open' | 'closed';

export interface Job {
  id: string;
  client_name: string;
  quoted_price_cents: number;
  status: JobStatus;
  created_at: string;
  closed_at: string | null;
}

export interface MaterialLine {
  id: string;
  job_id: string;
  name: string;
  cost_cents: number;
  qty: number;
  receipt_path: string | null;
  created_at: string;
}

export interface TimeEntry {
  id: string;
  job_id: string;
  hours: number;
  note: string | null;
  created_at: string;
}

export interface JobDetail extends Job {
  materials: MaterialLine[];
  time_entries: TimeEntry[];
  materials_cost_cents: number;
  labor_cost_cents: number;
  total_cost_cents: number;
  margin_cents: number;
  margin_pct: number;
}

export interface JobSummary extends Job {
  margin_pct: number;
  margin_cents: number;
}

export interface Settings {
  hourly_rate_cents: number;
  target_margin_pct: number;
}
