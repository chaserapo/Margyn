import { colors } from '@/constants/theme';
import { formatCents } from './format';
import type { JobDetail } from './types';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Builds a printable job report as HTML, for expo-print to render to PDF. */
export function buildJobReportHtml(job: JobDetail): string {
  const laborEntries = job.time_entries.filter((t) => t.kind !== 'travel');
  const travelEntries = job.time_entries.filter((t) => t.kind === 'travel');
  const closedDate = job.closed_at
    ? new Date(job.closed_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
    : '';

  const materialsRows =
    job.materials
      .map(
        (m) => `<tr><td>${escapeHtml(m.name)}</td><td class="num">${m.qty}</td><td class="num">${formatCents(
          m.cost_cents
        )}</td><td class="num">${formatCents(m.cost_cents * m.qty)}</td></tr>`
      )
      .join('') || '<tr><td colspan="4" class="muted">No materials logged</td></tr>';

  const timeRows =
    laborEntries
      .map((t) => `<tr><td>${escapeHtml(t.note || 'Logged time')}</td><td class="num">${t.hours}h</td></tr>`)
      .join('') || '<tr><td colspan="2" class="muted">No time logged</td></tr>';

  const travelRows = travelEntries
    .map((t) => `<tr><td>${escapeHtml(t.note || 'Travel')}</td><td class="num">${t.hours}h</td></tr>`)
    .join('');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: ${colors.text}; padding: 32px; }
  h1 { font-size: 26px; margin-bottom: 4px; }
  .muted { color: ${colors.textMuted}; }
  .meta { color: ${colors.textMuted}; margin-bottom: 24px; }
  .banner { border: 2px solid ${colors.good}; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px; }
  .banner .pct { font-size: 36px; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th, td { text-align: left; padding: 8px 4px; border-bottom: 1px solid ${colors.border}; font-size: 14px; }
  th { color: ${colors.textMuted}; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.4px; }
  td.num, th.num { text-align: right; }
  .section-title { font-size: 16px; font-weight: 700; margin: 24px 0 8px; }
  .breakdown td { border: none; padding: 4px; }
  .breakdown .bold { font-weight: 700; border-top: 1px solid ${colors.border}; padding-top: 8px; }
</style>
</head>
<body>
  <h1>${escapeHtml(job.client_name)}</h1>
  <div class="meta">${job.description ? escapeHtml(job.description) + ' &middot; ' : ''}${closedDate ? `Closed ${closedDate}` : 'Open job'}</div>

  <div class="banner">
    <div class="pct">${job.margin_pct.toFixed(0)}% margin</div>
    <div class="muted">${formatCents(job.margin_cents)} profit</div>
  </div>

  <table class="breakdown">
    <tr><td>Quoted price</td><td class="num">${formatCents(job.quoted_price_cents)}</td></tr>
    <tr><td>Materials</td><td class="num">- ${formatCents(job.materials_cost_cents)}</td></tr>
    <tr><td>Labor</td><td class="num">- ${formatCents(job.labor_cost_cents)}</td></tr>
    ${job.bills_travel ? `<tr><td>Travel</td><td class="num">- ${formatCents(job.travel_cost_cents)}</td></tr>` : ''}
    <tr class="bold"><td>Profit</td><td class="num">${formatCents(job.margin_cents)}</td></tr>
  </table>

  <div class="section-title">Materials</div>
  <table>
    <tr><th>Item</th><th class="num">Qty</th><th class="num">Unit</th><th class="num">Total</th></tr>
    ${materialsRows}
  </table>

  <div class="section-title">Time</div>
  <table>
    <tr><th>Note</th><th class="num">Hours</th></tr>
    ${timeRows}
  </table>

  ${
    job.bills_travel && travelRows
      ? `<div class="section-title">Travel</div>
  <table>
    <tr><th>Note</th><th class="num">Hours</th></tr>
    ${travelRows}
  </table>`
      : ''
  }
</body>
</html>`;
}
