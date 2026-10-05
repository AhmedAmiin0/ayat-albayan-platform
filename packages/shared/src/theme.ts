// The ONE source of colour values (docs/07 §3, §12); apps/web/src/styles/tokens.css carries the same
// hex (tokens.test.ts there diffs the two). Owner, 2026-10-03: stay around green and black, readable,
// with a green/gold primary button. Green-black surfaces and ink, deep GREEN for actions (gold text on
// the light primary, a gold edge on every primary), teal for «done/ok», amber only for «دورك», red for
// errors, gold for the primary edge and ornament. `lapis*` is the action token's historical name.
// theme.contrast.test.ts checks every text pair (AA).
export type ThemeName = 'light' | 'dark';

const light = {
  margin: '#eef3f0', page: '#ffffff', raised: '#ffffff', sunk: '#f3f7f4', ink: '#0b1410', ink2: '#2f3b35',
  ink3: '#4a5750', rule: '#e0e8e3', ruleStrong: '#c5d2ca', ruleInput: '#77857d', gold: '#b7891f',
  goldSoft: '#e4c97e', goldWash: '#faf2dc', lapis: '#166534', lapisHover: '#0f4a26', lapisWash: '#e6f4ea',
  onLapis: '#f3d58a', ok: '#0f766e', okSoft: '#e0f4f1', act: '#a14b06', actSoft: '#fdf1e1', bad: '#b91c1c',
  badSoft: '#fde8e8', badSolid: '#b91c1c', onBad: '#ffffff', neutralSoft: '#ebf0ed', inverse: '#0b1410',
  onInverse: '#f5f8f6', inverseGold: '#e4c97e', cover: '#0d1a13', leather: '#12301f', leatherDeep: '#0c2416',
  leatherLift: '#1a4029', goldOnCover: '#ecd18c', coverInk: '#f8fafc', scrim: 'rgba(5, 12, 8, 0.5)',
};

export type Palette = Record<keyof typeof light, string>;

const dark: Palette = {
  margin: '#050906', page: '#0a0f0c', raised: '#111a15', sunk: '#070c09', ink: '#edf3ef', ink2: '#c4d0c9',
  ink3: '#9fb0a6', rule: '#1f2c25', ruleStrong: '#2d3f35', ruleInput: '#64776c', gold: '#e0b95a',
  goldSoft: '#6b5523', goldWash: '#2a2210', lapis: '#4fc285', lapisHover: '#7fd9a6', lapisWash: '#10281b',
  onLapis: '#06100a', ok: '#5eead4', okSoft: '#0b2a26', act: '#fd9f68', actSoft: '#33200f', bad: '#fca5a5',
  badSoft: '#3a1717', badSolid: '#dc4b4b', onBad: '#06100a', neutralSoft: '#18221d', inverse: '#e2ebe5',
  onInverse: '#0a0f0c', inverseGold: '#8a6a1c', cover: '#0b1510', leather: '#0f2418', leatherDeep: '#0a1b11',
  leatherLift: '#173322', goldOnCover: '#ecd18c', coverInk: '#f8fafc', scrim: 'rgba(0, 0, 0, 0.65)',
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
    page: '0 18px 40px -18px rgba(5, 20, 12, 0.22)',
    pop: '0 30px 60px -20px rgba(5, 20, 12, 0.45)',
    toast: '0 12px 28px -12px rgba(5, 20, 12, 0.4)',
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
