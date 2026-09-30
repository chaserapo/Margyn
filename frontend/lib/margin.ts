import type { Job, JobDetail, JobSummary, MaterialLine, TimeEntry } from './types';

function marginFromCosts(quotedPriceCents: number, totalCostCents: number) {
  const marginCents = quotedPriceCents - totalCostCents;
  const marginPct = quotedPriceCents ? (marginCents / quotedPriceCents) * 100 : 0;
  return { marginCents, marginPct };
}

function laborAndTravelCost(
  timeEntries: { hours: number; kind?: string }[],
  hourlyRateCents: number,
  travelRateCents: number
) {
  let laborHours = 0;
  let travelHours = 0;
  for (const t of timeEntries) {
    if (t.kind === 'travel') travelHours += t.hours;
    else laborHours += t.hours;
  }
  return {
    laborCostCents: Math.round(laborHours * hourlyRateCents),
    travelCostCents: Math.round(travelHours * travelRateCents),
  };
}

export function computeJobDetail(
  job: Job,
  materials: MaterialLine[],
  timeEntries: TimeEntry[],
  hourlyRateCents: number,
  travelRateCents: number
): JobDetail {
  const materialsCostCents = materials.reduce((sum, m) => sum + m.cost_cents * m.qty, 0);
  const { laborCostCents, travelCostCents } = laborAndTravelCost(timeEntries, hourlyRateCents, travelRateCents);
  const totalCostCents = materialsCostCents + laborCostCents + travelCostCents;
  const { marginCents, marginPct } = marginFromCosts(job.quoted_price_cents, totalCostCents);

  return {
    ...job,
    materials,
    time_entries: timeEntries,
    materials_cost_cents: materialsCostCents,
    labor_cost_cents: laborCostCents,
    travel_cost_cents: travelCostCents,
    total_cost_cents: totalCostCents,
    margin_cents: marginCents,
    margin_pct: marginPct,
  };
}

/** Lighter-weight version for list views - takes pre-aggregated totals instead of full row arrays. */
export function computeJobSummary(
  job: Job,
  materials: { cost_cents: number; qty: number }[],
  timeEntries: { hours: number; kind?: string }[],
  hourlyRateCents: number,
  travelRateCents: number
): JobSummary {
  const materialsCostCents = materials.reduce((sum, m) => sum + m.cost_cents * m.qty, 0);
  const { laborCostCents, travelCostCents } = laborAndTravelCost(timeEntries, hourlyRateCents, travelRateCents);
  const totalCostCents = materialsCostCents + laborCostCents + travelCostCents;
  const { marginCents, marginPct } = marginFromCosts(job.quoted_price_cents, totalCostCents);

  return { ...job, margin_cents: marginCents, margin_pct: marginPct };
}
