import * as SplashScreen from 'expo-splash-screen';
import { palette, type StartupBrand, t } from '@ab/mobile-kit';
import splash from '../../assets/splash-icon.png';

/** app.json expo-splash-screen `imageWidth`: the in-app cover draws the mark at the same size. */
export const SPLASH_IMAGE_WIDTH = 160;

/**
 * The family app's startup look (docs/50): the native splash's mark on the same colours
 * (app.json: the deep green; dark: the dark cover), then the wordmark. Theme tokens only.
 */
export const familyBrand = (): StartupBrand => ({
  mark: splash,
  markSize: SPLASH_IMAGE_WIDTH,
  title: t.familyApp.signIn.wordmark,
  subtitle: t.familyApp.signIn.wordmarkArabic,
  // index.ts keeps the native splash up until the cover's mark is drawn (no bare frame).
  onShown: () => void SplashScreen.hideAsync().catch(() => undefined),
  tone: {
    light: {
      background: palette.light.coverInk,
      ink: palette.light.leather,
      accent: palette.light.goldSoft,
    },
    dark: { background: palette.dark.cover, ink: palette.dark.coverInk, accent: palette.dark.gold },
  },
});
