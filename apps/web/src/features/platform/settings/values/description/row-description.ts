import { settingDef, type SettingKey } from '@ab/shared';
import { settingText } from '@/components/settings/search/setting-text';
import { t } from '@/lib/i18n/i18n';
import { locale } from '@/lib/i18n/locale';
import type { DescribeTarget } from './describe-target';
import { shownDescription } from './description';
import type { ValuesApi } from '@/features/platform/settings/values/hooks/use-values-controller';
import type { RowMenuItem } from '@/features/platform/settings/values/sheet/RowMenu';

/** A settings row's dialog target: its key, label and registry hint key. */
export const settingTarget = (key: SettingKey): DescribeTarget => ({
  key,
  label: settingText(key).label,
  hintKey: settingDef(key).hintKey ?? null,
});

/** The row's muted line: the shown description (docs/26 §3 order), else `fallback` (the code's hint). */
export function rowDescription(api: ValuesApi, target: DescribeTarget, fallback?: string): string | undefined {
  return shownDescription({ entry: api.entry(target.key), hintKey: target.hintKey, locale, bundle: t }) ?? fallback;
}

/** «اقرأ الوصف وعدّله» in the row's «⋯» menu. */
export const describeItem = (api: ValuesApi, target: DescribeTarget): RowMenuItem => ({
  id: 'describe',
  label: t.settingsValues.describe.menu,
  onSelect: () => api.describe(target),
});
