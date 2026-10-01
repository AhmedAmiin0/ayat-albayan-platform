import { useColorScheme } from 'react-native';

// Ink & Gold tokens for React Native (docs/07 §12): the web tokens as sRGB hex, read from the rendered page.
// Gold is ornament only, lapis is the only action colour, saffron (`act`) only means «دورك».
// TODO(docs/07 §12): move to packages/shared/src/theme.ts once the web generates its CSS from it.
export type ThemeName = 'light' | 'dark';

const light = {
  margin: '#f2ead9', page: '#fbf8ef', raised: '#fefcf8', sunk: '#f5f0e3',
  ink: '#161f30', ink2: '#444d5e', ink3: '#5b6472',
  rule: '#dbd3c4', ruleStrong: '#c1b6a2', ruleInput: '#908572',
  gold: '#c59542', goldSoft: '#dbc090', goldWash: '#f6e6c7',
  lapis: '#264b99', lapisHover: '#183a83', lapisWash: '#dde8fd', onLapis: '#fbf8f1',
  ok: '#13684b', okSoft: '#d3f0e2',
  act: '#925019', actSoft: '#fde8cb',
  bad: '#ac312c', badSoft: '#ffe4e0', badSolid: '#b6322d', onBad: '#fbf8f1',
  neutralSoft: '#e2e6ee',
  inverse: '#192437', onInverse: '#f6f1e7', inverseGold: '#deb870',
  cover: '#142139', leather: '#4c2819', leatherDeep: '#371a0f', leatherLift: '#633d2c',
  goldOnCover: '#dfb76c', coverInk: '#ede7d9',
  scrim: 'rgba(19, 27, 41, 0.45)',
};

export type Palette = Record<keyof typeof light, string>;

const dark: Palette = {
  margin: '#090e18', page: '#111723', raised: '#171e2b', sunk: '#0d131d',
  ink: '#ede7db', ink2: '#c3bdb0', ink3: '#a39e91',
  rule: '#262e3c', ruleStrong: '#384355', ruleInput: '#656f81',
  gold: '#cca459', goldSoft: '#72592c', goldWash: '#2f210c',
  lapis: '#7facf0', lapisHover: '#95c0fe', lapisWash: '#1b2942', onLapis: '#080f1c',
  ok: '#7ecaa9', okSoft: '#112d21',
  act: '#f3ac75', actSoft: '#392311',
  bad: '#f58c81', badSoft: '#3b1c19', badSolid: '#d5584f', onBad: '#080f1c',
  neutralSoft: '#212730',
  inverse: '#e3decf', onInverse: '#131b29', inverseGold: '#996516',
  cover: '#19263f', leather: '#3d2014', leatherDeep: '#29120b', leatherLift: '#523122',
  goldOnCover: '#dfb76c', coverInk: '#ede7d9',
  scrim: 'rgba(1, 2, 5, 0.62)',
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
    page: '0 18px 40px -18px rgba(22, 31, 48, 0.28)',
    pop: '0 30px 60px -20px rgba(5, 11, 24, 0.55)',
    toast: '0 12px 28px -12px rgba(5, 11, 24, 0.5)',
  },
  dark: {
    page: '0 18px 40px -16px rgba(0, 0, 0, 0.65)',
    pop: '0 30px 60px -20px rgba(0, 0, 0, 0.7)',
    toast: '0 12px 28px -12px rgba(0, 0, 0, 0.6)',
  },
};

/** Family names as registered by useFonts in app/_layout.tsx. Amiri: titles ≥ 20px only. */
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

export interface Theme {
  name: ThemeName;
  color: Palette;
  elevation: Elevation;
}

const themes: Record<ThemeName, Theme> = {
  light: { name: 'light', color: palette.light, elevation: elevation.light },
  dark: { name: 'dark', color: palette.dark, elevation: elevation.dark },
};

/** Follows the system colour scheme (app.json userInterfaceStyle: automatic); stable object per scheme. */
export function useTheme(): Theme {
  return themes[useColorScheme() === 'dark' ? 'dark' : 'light'];
}
