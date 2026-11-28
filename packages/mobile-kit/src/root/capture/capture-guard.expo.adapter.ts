import {
  allowScreenCaptureAsync,
  disableAppSwitcherProtectionAsync,
  enableAppSwitcherProtectionAsync,
  preventScreenCaptureAsync,
} from 'expo-screen-capture';
import type { CaptureGuard, ExpoGuardOptions } from './capture-guard.port';

// One key: the library counts prevent calls per key, so an allow with it always lifts the block.
const KEY = 'app-capture-guard';
const FULL_BLUR = 1;

const SWITCHER_CALLS: Readonly<Record<'on' | 'off', () => Promise<void>>> = {
  on: () => enableAppSwitcherProtectionAsync(FULL_BLUR),
  off: () => disableAppSwitcherProtectionAsync(),
};
const none = (): Promise<void> => Promise.resolve();

/**
 * Android: FLAG_SECURE (screenshots and recordings come out black, the recents preview is blank).
 * iOS 13+: the content is hidden from screenshots and recordings by the library's secure layer.
 */
export function expoCaptureGuard({ switcher }: ExpoGuardOptions): CaptureGuard {
  const on = switcher ? SWITCHER_CALLS.on : none;
  const off = switcher ? SWITCHER_CALLS.off : none;
  return {
    block: async () => {
      await Promise.all([preventScreenCaptureAsync(KEY), on()]);
    },
    allow: async () => {
      await Promise.all([allowScreenCaptureAsync(KEY), off()]);
    },
  };
}
