export const colors = {
  background: '#F7F7F5',
  surface: '#FFFFFF',
  border: '#E4E2DD',
  text: '#1C1C1A',
  textMuted: '#6B6B66',
  primary: '#1F6F4A',
  good: '#1F6F4A',
  warn: '#B8860B',
  bad: '#B23A2E',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export function marginColor(marginPct: number, targetPct: number): string {
  if (marginPct >= targetPct) return colors.good;
  if (marginPct >= targetPct - 10) return colors.warn;
  return colors.bad;
}
