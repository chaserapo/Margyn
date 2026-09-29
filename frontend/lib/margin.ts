import type { Job, JobDetail, JobSummary, MaterialLine, TimeEntry } from './types';

function marginFromCosts(quotedPriceCents: number, totalCostCents: number) {
  const marginCents = quotedPriceCents - totalCostCents;
  const marginPct = quotedPriceCents ? (marginCents / quotedPriceCents) * 100 : 0;
  return { marginCents, marginPct };
}

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
  const { marginCents, marginPct } = marginFromCosts(job.quoted_price_cents, totalCostCents);

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

/** Lighter-weight version for list views - takes pre-aggregated totals instead of full row arrays. */
export function computeJobSummary(
  job: Job,
  materials: { cost_cents: number; qty: number }[],
  timeEntries: { hours: number }[],
  hourlyRateCents: number
): JobSummary {
  const materialsCostCents = materials.reduce((sum, m) => sum + m.cost_cents * m.qty, 0);
  const totalHours = timeEntries.reduce((sum, t) => sum + t.hours, 0);
  const laborCostCents = Math.round(totalHours * hourlyRateCents);
  const totalCostCents = materialsCostCents + laborCostCents;
  const { marginCents, marginPct } = marginFromCosts(job.quoted_price_cents, totalCostCents);

  return { ...job, margin_cents: marginCents, margin_pct: marginPct };
}
