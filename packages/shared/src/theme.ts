// The ONE source of colour values (docs/07 §3, §12); apps/web/src/styles/tokens.css carries the same
// hex (tokens.test.ts there diffs the two). Owner, 2026-10-05 («Emerald Mint»): white pages, an emerald
// action with white text on its fill, a light mint sidebar (dark green text) in light, a SOFT
// green-grey dark mode (never near-black), no beige/cream. Green for «done/ok», amber only for «دورك»,
// red for errors, gold for small ornament only. `lapis*` is the action token's historical name:
// `lapis` is the action as TEXT (links, ghost buttons, focus), `lapisFill` the primary button's fill
// and `lapisHover` its hover. The sidebar and login cover use cover/leather* with coverInk/goldOnCover.
// `read` is the WhatsApp-like blue of read ticks (non-text, 3:1 on our bubble).
// theme.contrast.test.ts checks every text pair (AA).
export type ThemeName = 'light' | 'dark';

const light = {
  margin: '#f3f7f5', page: '#ffffff', raised: '#ffffff', sunk: '#f1f5f3', ink: '#17201c', ink2: '#2f3a35',
  ink3: '#4f5b55', rule: '#e2e8e5', ruleStrong: '#c8d2cd', ruleInput: '#77857d', gold: '#b7891f',
  goldSoft: '#e4c97e', goldWash: '#eef7f1', lapis: '#047857', lapisFill: '#047857', lapisHover: '#065f46',
  lapisWash: '#ecfdf5', onLapis: '#ffffff', ok: '#15803d', okSoft: '#eaf7ee', act: '#a14b06', actSoft: '#fdf1e1',
  bad: '#b91c1c', badSoft: '#fde8e8', badSolid: '#b91c1c', onBad: '#ffffff', neutralSoft: '#ebf0ed',
  inverse: '#17201c', onInverse: '#f5f8f6', inverseGold: '#e4c97e', cover: '#ecfdf5', leather: '#ecfdf5',
  leatherDeep: '#d1fae5', leatherLift: '#f0fdf8', goldOnCover: '#064e3b', coverInk: '#064e3b',
  scrim: 'rgba(15, 30, 22, 0.42)', read: '#0284c7',
};

export type Palette = Record<keyof typeof light, string>;

const dark: Palette = {
  margin: '#1a211e', page: '#1e2623', raised: '#27312d', sunk: '#222b27', ink: '#e9efec', ink2: '#cfd8d3',
  ink3: '#adbab3', rule: '#35413c', ruleStrong: '#45524c', ruleInput: '#74837c', gold: '#e0b95a',
  goldSoft: '#6b5a2c', goldWash: '#2a3a31', lapis: '#5eead4', lapisFill: '#047857', lapisHover: '#065f46',
  lapisWash: '#213a2c', onLapis: '#ffffff', ok: '#7ee2a6', okSoft: '#20372b', act: '#fd9f68', actSoft: '#3d2b1c',
  bad: '#fca5a5', badSoft: '#432628', badSolid: '#dc4b4b', onBad: '#0f1512', neutralSoft: '#2c3632',
  inverse: '#e2ebe5', onInverse: '#1e2623', inverseGold: '#8a6a1c', cover: '#18201d', leather: '#18201d',
  leatherDeep: '#141b18', leatherLift: '#26302c', goldOnCover: '#ecd18c', coverInk: '#e9efec',
  scrim: 'rgba(10, 16, 13, 0.5)', read: '#53bdeb',
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
    page: '0 18px 40px -16px rgba(0, 0, 0, 0.4)',
    pop: '0 30px 60px -20px rgba(0, 0, 0, 0.5)',
    toast: '0 12px 28px -12px rgba(0, 0, 0, 0.45)',
  },
};

/** Font family names as registered with expo-font: Noto Sans Arabic only (owner, 2026-10-05: easier
 *  to read); titles are its 700 weight. */
export const type = {
  display: 'NotoSansArabic_700Bold',
  ui: {
    400: 'NotoSansArabic_400Regular',
    500: 'NotoSansArabic_500Medium',
    600: 'NotoSansArabic_600SemiBold',
    700: 'NotoSansArabic_700Bold',
  },
  size: { '2xs': 12, xs: 13, sm: 14, body: 15, base: 16, lg: 18, h4: 20, h3: 23, h2: 28, h1: 32 },
  /** Arabic line-heights: 1.5 for titles, 1.6 for UI text. */
  lineHeight: (size: number, display = false) => Math.round(size * (display ? 1.5 : 1.6)),
};

export const shape = {
  radius: { xs: 2, sm: 6, md: 8, lg: 12, pill: 999 },
  control: { dense: 32, default: 40, comfort: 48, touch: 44 },
} as const;
export const space = [0, 4, 8, 12, 16, 24, 32, 48] as const;
export const motion = { fast: 120, base: 200 } as const;
