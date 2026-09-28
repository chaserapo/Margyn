import type { Job, JobDetail, MaterialLine, TimeEntry } from './types';

export function computeJobDetail(
  job: Job,
  materials: MaterialLine[],
  timeEntries: TimeEntry[],
  hourlyRateCents: number
): JobDetail {
  const materialsCostCents = materials.reduce((sum, m) => sum + m.cost_cents * m.qty, 0);
  const totalHours = timeEntries.reduce((sum, t) => sum + t.hours, 0);
  const laborCostCents = Math.round(totalHours * hourlyRateCents);
  const totalCostCents = materialsCostCents + laborCostCents;
  const marginCents = job.quoted_price_cents - totalCostCents;
  const marginPct = job.quoted_price_cents ? (marginCents / job.quoted_price_cents) * 100 : 0;

  return {
    ...job,
    materials,
    time_entries: timeEntries,
    materials_cost_cents: materialsCostCents,
    labor_cost_cents: laborCostCents,
    total_cost_cents: totalCostCents,
    margin_cents: marginCents,
    margin_pct: marginPct,
  };
}
