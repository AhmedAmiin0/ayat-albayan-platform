import type { Locale } from '@ab/shared';
import { I18nManager } from 'react-native';

// UI language (Phase 7): Arabic RTL by default, English LTR on request. The native RTL flag that
// I18nManager.forceRTL persists is the one thing known synchronously at boot, so it picks the
// dictionary: RTL = Arabic, LTR = English. app/_layout applies the saved choice before the first
// screen (lib/locale-switch: flip the flag, reload), so `t` and every style stay fixed per run.

export function bootLocale(): Locale {
  return I18nManager.isRTL ? 'ar' : 'en';
}

/** This run's UI language. Changing it means a reload (setLocale). */
export const locale: Locale = bootLocale();
