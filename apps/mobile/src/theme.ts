import { elevation, palette, type Elevation, type Palette, type ThemeName } from '@ab/shared';
import { useColorScheme } from 'react-native';

// Ink & Gold tokens for React Native (docs/07 §12). The values live in ONE place,
// packages/shared/src/theme.ts (contrast-checked in CI); this module only picks the scheme.
export { elevation, motion, palette, shape, space, type } from '@ab/shared';
export type { Elevation, Palette, ThemeName } from '@ab/shared';

export interface Theme {
  name: ThemeName;
  color: Palette;
  elevation: Elevation;
}

const themes: Record<ThemeName, Theme> = {
  light: { name: 'light', color: palette.light, elevation: elevation.light },
  dark: { name: 'dark', color: palette.dark, elevation: elevation.dark },
};

/**
 * Follows the system colour scheme (app.json userInterfaceStyle: automatic); stable object per scheme.
 * TODO(docs/07 §12): a manual «تلقائي / فاتح / ليلي» override in settings once the app has a
 * settings screen (mobile track, R-MOB).
 */
export function useTheme(): Theme {
  return themes[useColorScheme() === 'dark' ? 'dark' : 'light'];
}
