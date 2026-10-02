// Ink & Gold tokens on the academy brand palette (docs/07 §3, §12): the ONE source of colour values.
// apps/web/src/styles/tokens.css carries the same hex (tokens.test.ts there diffs the two).
// Gold decorates, GREEN acts: `lapis*` is the action token's historical name and now holds the
// brand green; saffron (`act`) only means «دورك». theme.contrast.test.ts checks every text pair.
// Brand source: the Apps Script «Brand» library palette T (green #0C2A1E/#14503A/#1E6B4C,
// gold #C2A24A, paper #FDF8F0, ink #14261E, warn #B4842A, bad #9C3B2E).
export type ThemeName = 'light' | 'dark';

const light = {
  margin: '#f5eddd', page: '#fdf8f0', raised: '#fffdf9', sunk: '#f7f0e1',
  ink: '#14261e', ink2: '#3c4b44', ink3: '#55625b',
  rule: '#e5d9bf', ruleStrong: '#cdbb94', ruleInput: '#958666',
  gold: '#c2a24a', goldSoft: '#d6bc80', goldWash: '#e7dab4',
  lapis: '#14503a', lapisHover: '#0c2a1e', lapisWash: '#e1ede5', onLapis: '#fdf8f0',
  ok: '#1e6b4c', okSoft: '#dcebdf',
  act: '#8c5212', actSoft: '#f6e7c6',
  bad: '#9c3b2e', badSoft: '#f8e1db', badSolid: '#9c3b2e', onBad: '#fdf8f0',
  neutralSoft: '#e9e7dd',
  inverse: '#0c2a1e', onInverse: '#fdf8f0', inverseGold: '#d6bc80',
  cover: '#0c2a1e', leather: '#14402f', leatherDeep: '#0b281c', leatherLift: '#1f553f',
  goldOnCover: '#d6bc80', coverInk: '#f3ead6',
  scrim: 'rgba(12, 38, 28, 0.45)',
};

export type Palette = Record<keyof typeof light, string>;

const dark: Palette = {
  margin: '#07110c', page: '#0c1913', raised: '#112019', sunk: '#09150f',
  ink: '#efe8d8', ink2: '#c7bfac', ink3: '#a49d8b',
  rule: '#1f3229', ruleStrong: '#2f463a', ruleInput: '#5f766a',
  gold: '#cfb062', goldSoft: '#6c5a2b', goldWash: '#29230f',
  lapis: '#78c49c', lapisHover: '#92d4b0', lapisWash: '#122a1f', onLapis: '#06120c',
  ok: '#8fcf95', okSoft: '#112a17',
  act: '#f2aa6b', actSoft: '#36220f',
  bad: '#f0927f', badSoft: '#3a1914', badSolid: '#d0604d', onBad: '#06120c',
  neutralSoft: '#1d2621',
  inverse: '#ece4d2', onInverse: '#0c1913', inverseGold: '#8a6a1c',
  cover: '#0e2419', leather: '#123826', leatherDeep: '#0a2117', leatherLift: '#1b4a35',
  goldOnCover: '#d6bc80', coverInk: '#f3ead6',
  scrim: 'rgba(1, 5, 3, 0.62)',
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
    page: '0 18px 40px -18px rgba(20, 38, 30, 0.28)',
    pop: '0 30px 60px -20px rgba(4, 16, 11, 0.55)',
    toast: '0 12px 28px -12px rgba(4, 16, 11, 0.5)',
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
