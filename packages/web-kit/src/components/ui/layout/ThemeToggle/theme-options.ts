import type { SegmentOption } from '@ab/web-kit/components/ui/form/SegmentedControl';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { ThemePref } from '@ab/web-kit/lib/theme';

export const THEME_OPTIONS: SegmentOption<ThemePref>[] = [
  { value: 'auto', label: t.theme.auto, icon: 'monitor' },
  { value: 'light', label: t.theme.light, icon: 'sun' },
  { value: 'dark', label: t.theme.dark, icon: 'moon' },
];
