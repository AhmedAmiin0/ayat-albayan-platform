import {
  elevation,
  glass,
  palette,
  type Elevation,
  type Glass,
  type Palette,
  type ThemeName,
} from '@ab/catalog';
import { useColorScheme } from 'react-native';

// Ink & Gold tokens for React Native (docs/07 §12). The values live in ONE place,
// packages/shared/src/theme.ts (contrast-checked in CI); this module only picks the scheme.
export { glass, motion, palette, shape, space, type } from '@ab/catalog';
export type { Elevation, Glass, GlassStop, Palette, ThemeName } from '@ab/catalog';

export interface Theme {
  name: ThemeName;
  color: Palette;
  elevation: Elevation;
  /** The floating tab bar (src/ui/GlassTabBar.tsx). */
  glass: Glass;
}

const themes: Record<ThemeName, Theme> = {
  light: { name: 'light', color: palette.light, elevation: elevation.light, glass: glass.light },
  dark: { name: 'dark', color: palette.dark, elevation: elevation.dark, glass: glass.dark },
};

/** Stable object per scheme; the manual override uses Appearance.setColorScheme. */
export function useTheme(): Theme {
  return themes[useColorScheme() === 'dark' ? 'dark' : 'light'];
}
