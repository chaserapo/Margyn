import type { Job, JobDetail, JobSummary, MaterialLine, TimeEntry } from './types';

/** Coerces a possibly-missing or non-finite number (e.g. a column not yet migrated) to a safe fallback. */
function safeNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function marginFromCosts(quotedPriceCents: number, totalCostCents: number) {
  const marginCents = quotedPriceCents - totalCostCents;
  const marginPct = quotedPriceCents ? (marginCents / quotedPriceCents) * 100 : 0;
  return { marginCents: safeNumber(marginCents), marginPct: safeNumber(marginPct) };
}

function laborAndTravelCost(
  timeEntries: { hours: number; kind?: string }[],
  hourlyRateCents: number,
  travelRateCents: number
) {
  let laborHours = 0;
  let travelHours = 0;
  for (const t of timeEntries) {
    const hours = safeNumber(t.hours);
    if (t.kind === 'travel') travelHours += hours;
    else laborHours += hours;
  }
  return {
    laborCostCents: Math.round(laborHours * safeNumber(hourlyRateCents)),
    travelCostCents: Math.round(travelHours * safeNumber(travelRateCents)),
  };
}

export function computeJobDetail(
  job: Job,
  materials: MaterialLine[],
  timeEntries: TimeEntry[],
  hourlyRateCents: number
): JobDetail {
  const materialsCostCents = materials.reduce((sum, m) => sum + safeNumber(m.cost_cents) * safeNumber(m.qty, 1), 0);
  const { laborCostCents, travelCostCents } = laborAndTravelCost(timeEntries, hourlyRateCents, job.travel_rate_cents);
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
  hourlyRateCents: number
): JobSummary {
  const materialsCostCents = materials.reduce((sum, m) => sum + safeNumber(m.cost_cents) * safeNumber(m.qty, 1), 0);
  const { laborCostCents, travelCostCents } = laborAndTravelCost(timeEntries, hourlyRateCents, job.travel_rate_cents);
  const totalCostCents = materialsCostCents + laborCostCents + travelCostCents;
  const { marginCents, marginPct } = marginFromCosts(job.quoted_price_cents, totalCostCents);

  return { ...job, margin_cents: marginCents, margin_pct: marginPct };
}
