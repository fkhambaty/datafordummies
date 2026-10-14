/** Native port of the tokens in css/dfd-system.css. */
export const colors = {
  ink: '#0f172a',
  text: '#1e293b',
  muted: '#475569',
  faint: '#64748b',
  line: '#e2e8f0',
  surface: '#ffffff',
  wash: '#f8fafc',
  accent: '#4f46e5',
  accentStrong: '#4338ca',
  accentSoft: '#eef2ff',
  accentEnd: '#7c3aed',
  ok: '#047857',
  okSoft: '#ecfdf5',
  warn: '#b45309',
  warnSoft: '#fffbeb',
  danger: '#b91c1c',
  dangerSoft: '#fef2f2',
} as const;

export const fonts = {
  regular: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  semibold: 'Outfit_600SemiBold',
  bold: 'Outfit_700Bold',
} as const;

export const radius = { lg: 16, md: 10, pill: 999 } as const;

export const space = (steps: number): number => steps * 8;

/** The site makes key actions at least 48px tall at phone widths. */
export const MIN_TOUCH = 48;

export const shadow = {
  shadowColor: colors.ink,
  shadowOpacity: 0.06,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 8 },
  elevation: 2,
} as const;
