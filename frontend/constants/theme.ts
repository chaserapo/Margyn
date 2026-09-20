export const colors = {
  background: '#F7F4EE',
  surface: '#FFFFFF',
  border: '#E2DDD2',
  text: '#231F20',
  textMuted: '#726B62',
  primary: '#231F20',
  onPrimary: '#F7F4EE',
  // Functional status colors for the margin indicator only - not part of the
  // brand's two-color (ink/cream) identity.
  good: '#1F7A4D',
  warn: '#B8860B',
  bad: '#B23A2E',
};

export const fonts = {
  display: 'Anton',
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
