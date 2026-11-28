import { Platform } from 'react-native';
import { expoCaptureGuard } from './capture-guard.expo.adapter';
import { noCaptureGuard } from './capture-guard.none.adapter';
import type { CaptureGuard } from './capture-guard.port';

const GUARDS: Readonly<Partial<Record<typeof Platform.OS, CaptureGuard>>> = {
  android: expoCaptureGuard({ switcher: false }),
  ios: expoCaptureGuard({ switcher: true }),
};

export const captureGuard = (os: typeof Platform.OS = Platform.OS): CaptureGuard =>
  GUARDS[os] ?? noCaptureGuard;
