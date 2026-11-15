import type { ImageSourcePropType } from 'react-native';
import type { ThemeName } from '../../theme';

/** The colours of a branded startup cover in one scheme (theme tokens only, docs/07). */
export interface StartupTone {
  /** The native splash's own backgroundColor (app.json expo-splash-screen), so the hand-off is
   *  seamless. */
  background: string;
  /** The wordmark and the status line. */
  ink: string;
  /** The connecting dots. */
  accent: string;
}

/**
 * An app's own startup look (the family app, docs/50), given to RootFrame. The cover starts as the
 * native splash left it: the same image, the same size, at the window's centre, on the same colour;
 * then the wordmark fades in under it.
 */
export interface StartupBrand {
  /** The native splash's image (app.json expo-splash-screen `image`). */
  mark: ImageSourcePropType;
  /** Its `imageWidth` (dp = pt). */
  markSize: number;
  /** The wordmark («Ayat Al-Bayan») and the line under it («آيات البيان»). */
  title: string;
  subtitle: string;
  tone: Record<ThemeName, StartupTone>;
  /** The mark is drawn: the app hides its native splash now (expo-splash-screen), so the
   *  hand-off never shows a frame without it. */
  onShown?: () => void;
}
