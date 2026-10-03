// The ONE source of colour values (docs/07 §3, §12); apps/web/src/styles/tokens.css carries the same
// hex (tokens.test.ts there diffs the two). Readability first (owner, 2026-10-03: the dark green and
// cream were hard to read): neutral white/slate surfaces, near-black ink, a clear BLUE for actions,
// green only for «done/ok», amber only for «دورك», red for errors, gold as decoration only.
// `lapis*` is the action token's historical name. theme.contrast.test.ts checks every text pair (AA).
export type ThemeName = 'light' | 'dark';

const light = {
  margin: '#eef1f5', page: '#ffffff', raised: '#ffffff', sunk: '#f4f6f9', ink: '#111827', ink2: '#374151',
  ink3: '#4b5563', rule: '#e3e7ee', ruleStrong: '#c9d0db', ruleInput: '#7d8696', gold: '#b7891f',
  goldSoft: '#e4c97e', goldWash: '#faf2dc', lapis: '#1d4ed8', lapisHover: '#1e3a8a', lapisWash: '#e8eefd',
  onLapis: '#ffffff', ok: '#047857', okSoft: '#e2f5ec', act: '#a14b06', actSoft: '#fdf1e1', bad: '#b91c1c',
  badSoft: '#fde8e8', badSolid: '#b91c1c', onBad: '#ffffff', neutralSoft: '#eceff4', inverse: '#111827',
  onInverse: '#f9fafb', inverseGold: '#e4c97e', cover: '#1e293b', leather: '#1e3a5f', leatherDeep: '#172b47',
  leatherLift: '#264a78', goldOnCover: '#ecd18c', coverInk: '#f8fafc', scrim: 'rgba(15, 23, 42, 0.45)',
};

export type Palette = Record<keyof typeof light, string>;

const dark: Palette = {
  margin: '#0b1120', page: '#0f172a', raised: '#162036', sunk: '#0c1426', ink: '#f1f5f9', ink2: '#cbd5e1',
  ink3: '#a6b2c4', rule: '#243049', ruleStrong: '#334462', ruleInput: '#6b7a94', gold: '#e0b95a',
  goldSoft: '#6b5523', goldWash: '#2a2210', lapis: '#8fb0ff', lapisHover: '#b3caff', lapisWash: '#17264a',
  onLapis: '#0b1120', ok: '#6ee7b7', okSoft: '#0f2a22', act: '#fd9f68', actSoft: '#33200f', bad: '#fca5a5',
  badSoft: '#3a1717', badSolid: '#dc4b4b', onBad: '#0b1120', neutralSoft: '#1c2638', inverse: '#e2e8f0',
  onInverse: '#0f172a', inverseGold: '#8a6a1c', cover: '#111a2e', leather: '#16233d', leatherDeep: '#0e182c',
  leatherLift: '#1f3150', goldOnCover: '#ecd18c', coverInk: '#f8fafc', scrim: 'rgba(2, 6, 23, 0.65)',
};

export const palette: Record<ThemeName, Palette> = { light, dark };

export interface Elevation {
  page: string;
  pop: string;
  toast: string;
}

// RN 0.86 (New Architecture) takes CSS boxShadow strings: the main layer of each web elevation.
export const elevation: Record<ThemeName, Elevation> = {
  light: {
    page: '0 18px 40px -18px rgba(15, 23, 42, 0.22)',
    pop: '0 30px 60px -20px rgba(15, 23, 42, 0.45)',
    toast: '0 12px 28px -12px rgba(15, 23, 42, 0.4)',
  },
  dark: {
    page: '0 18px 40px -16px rgba(0, 0, 0, 0.65)',
    pop: '0 30px 60px -20px rgba(0, 0, 0, 0.7)',
    toast: '0 12px 28px -12px rgba(0, 0, 0, 0.6)',
  },
};

/** Font family names as registered with expo-font. Amiri: titles ≥ 20px only. */
export const type = {
  display: 'Amiri_700Bold',
  ui: {
    400: 'IBMPlexSansArabic_400Regular',
    500: 'IBMPlexSansArabic_500Medium',
    600: 'IBMPlexSansArabic_600SemiBold',
    700: 'IBMPlexSansArabic_700Bold',
  },
  size: { '2xs': 12, xs: 13, sm: 14, body: 15, base: 16, lg: 18, h4: 20, h3: 23, h2: 28, h1: 32 },
  /** Arabic line-heights: 1.5 for Amiri titles, 1.6 for Plex UI text. */
  lineHeight: (size: number, display = false) => Math.round(size * (display ? 1.5 : 1.6)),
};

export const shape = {
  radius: { xs: 2, sm: 6, md: 8, lg: 12, pill: 999 },
  control: { dense: 32, default: 40, comfort: 48, touch: 44 },
} as const;
export const space = [0, 4, 8, 12, 16, 24, 32, 48] as const;
export const motion = { fast: 120, base: 200 } as const;
