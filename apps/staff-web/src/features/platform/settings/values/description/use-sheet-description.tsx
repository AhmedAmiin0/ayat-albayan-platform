import type { SettingKey } from '@ab/settings';
import type { ReactNode } from 'react';
import { settingText } from '@/components/settings/search/setting-text';
import { t } from '@ab/web-kit';
import { canEditDescription } from './description';
import { rowDescription, settingTarget } from './row-description';
import { useDescribeRights } from './use-describe-rights';
import { useValues } from '@/features/platform/settings/values/values-context';


/** Undefined with neither text nor edit right; `hideText` when the impact note repeats it. */
export function useSheetDescription(settingKey: SettingKey, hideText: boolean): ReactNode | undefined {
  const api = useValues();
  const rights = useDescribeRights();
  const words = settingText(settingKey);
  const target = settingTarget(settingKey);
  const text = hideText ? undefined : (words.toggleHint ?? rowDescription(api, target, words.hint));
  const editable = canEditDescription(api.entry(settingKey), rights);
  if (!text && !editable) return undefined;
  return (
    <>
      {text}
      {text && editable && ' '}
      {editable && (
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={() => api.describe(target)}
          className="inline-flex min-h-11 items-center font-semibold text-lapis underline underline-offset-4 sm:min-h-6"
        >
          {t.settingsValues.describe.edit}
        </button>
      )}
    </>
  );
}
