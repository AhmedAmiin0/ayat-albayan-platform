import { z } from 'zod';
import app from '../../app.json';
import { familyBrand, SPLASH_IMAGE_WIDTH } from './family-brand';

// The hand-off from the native splash shows no jump only if the cover draws what it drew: the
// same image width and the same background in each scheme (app.json is the native side).
const splashPlugin = z.tuple([
  z.literal('expo-splash-screen'),
  z.object({
    image: z.string(),
    imageWidth: z.number(),
    backgroundColor: z.string(),
    dark: z.object({ backgroundColor: z.string() }),
  }),
]);
const splash = app.expo.plugins.map((p) => splashPlugin.safeParse(p)).find((r) => r.success)?.data;

test('the cover draws the mark at the native splash size, on its colours', () => {
  const brand = familyBrand();
  const native = splash?.[1];
  expect(native?.imageWidth).toBe(SPLASH_IMAGE_WIDTH);
  expect(native?.image).toBe('./assets/splash-icon.png');
  expect(brand.markSize).toBe(SPLASH_IMAGE_WIDTH);
  expect(brand.tone.light.background.toLowerCase()).toBe(native?.backgroundColor.toLowerCase());
  expect(brand.tone.dark.background.toLowerCase()).toBe(native?.dark.backgroundColor.toLowerCase());
});

test('the app is named in English; its icons are its own, not the staff mark', () => {
  expect(app.expo.name).toBe('Ayat Al-Bayan');
  expect(app.expo.icon).toBe('./assets/icon.png');
  expect(JSON.stringify(app.expo)).not.toContain('../mobile/assets');
});
