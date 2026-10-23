import type { SettingKey } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import { t } from '@/lib/i18n';
import { RegistryField } from '../../registry-form/RegistryField';
import type { SettingsFormState } from '../../registry-form/use-settings-form';
import { SaveBar } from '../../SaveBar';

const r = t.notificationRules;

/**
 * «مواعيد الرسائل» (D14): the messaging engine's own timing fields and their «حفظ», in a tab of their
 * own. The reminder and follow-up timings belong to their rows on «الإشعارات» (docs/23b §1), which the
 * line on top links to. The form lives on the page, so switching tabs keeps an unsaved edit.
 */
export function TimingTab({ state, keys }: { state: SettingsFormState; keys: readonly SettingKey[] }) {
  return (
    <div className="grid min-w-0 gap-2">
      <p className="flex flex-wrap items-center gap-x-2 text-xs text-ink-2">
        <span>{r.timingMoved}</span>
        <Link
          to="/admin/settings/communications"
          search={{ tab: 'catalogue' }}
          className="inline-flex min-h-11 items-center font-semibold text-lapis underline underline-offset-4 sm:min-h-0"
        >
          {r.timingMovedLink}
        </Link>
      </p>
      <div>
        {keys.map((k) => (
          <RegistryField key={k} settingKey={k} state={state} />
        ))}
      </div>
      <SaveBar state={state} />
    </div>
  );
}
