import type { SettingKey } from '@ab/settings';
import { settingText } from '@/components/settings/search/setting-text';
import { Button, NuqtaGlyph, t } from '@ab/web-kit';
import { rowActionName } from '@/features/platform/settings/values/cells/ActionCell';
import { conflictText } from './conflict-text';
import { useValues } from '@/features/platform/settings/values/values-context';

const c = t.settingsValues.conflict;

/** Someone saved first (409): the edit stays until the admin keeps it or takes the newer value. */
export function ConflictNotice({ settingKey }: { settingKey: SettingKey }) {
  const api = useValues();
  const s = api.status(settingKey);
  if (s.state !== 'conflict') return null;
  const name = settingText(settingKey).label;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-md bg-act-soft px-3 py-2.5 text-sm text-ink shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--saffron)_35%,transparent)]">
      <NuqtaGlyph shape="hollow" className="mt-1 shrink-0 text-act" />
      <div className="grid min-w-0 flex-1 gap-2">
        <p>{conflictText({ key: settingKey, conflict: s.conflict, mine: s.mine })}</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" aria-label={rowActionName(c.keepMine, name)} onClick={() => api.keepMine(settingKey)}>
            {c.keepMine}
          </Button>
          <Button size="sm" variant="ghost" aria-label={rowActionName(c.takeTheirs, name)} onClick={() => api.takeTheirs(settingKey)}>
            {c.takeTheirs}
          </Button>
        </div>
      </div>
    </div>
  );
}

