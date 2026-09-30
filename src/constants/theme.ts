/** Shared visual values for Nutrivo screens and components. */
export const Colors = {
  background: '#F8FAF3',
  surface: '#FFFFFF',
  primary: '#15552C',
  primaryPressed: '#104223',
  onPrimary: '#FFFFFF',
  accent: '#E5F5C7',
  accentStrong: '#A9D968',
  text: '#101713',
  textMuted: '#65706A',
  border: '#E5EBE5',
  progressTrack: '#EDF2E9',
  error: '#C53C3C',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  section: 32,
} as const;

export const Radii = {
  input: 12,
  button: 16,
  card: 20,
  feature: 24,
  pill: 999,
} as const;

export const Typography = {
  sizes: {
    caption: 12,
    small: 14,
    body: 16,
    section: 20,
    title: 28,
    display: 36,
    metric: 32,
  },
  lineHeights: {
    caption: 18,
    small: 20,
    body: 24,
    section: 26,
    title: 34,
    display: 42,
    metric: 38,
  },
  weights: {
    medium: '500',
    semibold: '600',
    bold: '700',
    heavy: '800',
  },
} as const;

export const ContentWidths = {
  form: 440,
  page: 760,
  dashboard: 1100,
} as const;

export const ControlHeight = 52;
