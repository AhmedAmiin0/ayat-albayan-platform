import type { Locale } from '@ab/shared';
import { I18nManager } from 'react-native';

// The persisted native RTL flag is the only thing known synchronously at boot, so it picks.

export function bootLocale(): Locale {
  return I18nManager.isRTL ? 'ar' : 'en';
}

/** This run's UI language. Changing it means a reload (setLocale). */
export const locale: Locale = bootLocale();
