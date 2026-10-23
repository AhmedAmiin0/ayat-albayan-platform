import type { SettingKey } from '@ab/shared';
import { Button } from '@/components/ui/button';
import { NuqtaGlyph } from '@/components/ui/nuqta-glyph';
import { t } from '@/lib/i18n';
import { conflictText } from './conflict-text';
import { useValues } from './values-context';

const c = t.settingsValues.conflict;

/**
 * Someone saved this value first (409 conflict): saffron, because the save waits for the admin's
 * choice («دورك»). The edit stays; «احفظ قيمتي» saves it over the newer version, «اعتمد القيمة
 * الجديدة» drops it. Nothing when the row has no conflict.
 */
export function ConflictNotice({ settingKey }: { settingKey: SettingKey }) {
  const api = useValues();
  const s = api.status(settingKey);
  if (s.state !== 'conflict') return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-md bg-act-soft px-3 py-2.5 text-sm text-ink shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--saffron)_35%,transparent)]">
      <NuqtaGlyph shape="hollow" className="mt-1 shrink-0 text-act" />
      <div className="grid min-w-0 flex-1 gap-2">
        <p>{conflictText({ key: settingKey, conflict: s.conflict, mine: s.mine })}</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => api.keepMine(settingKey)}>
            {c.keepMine}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => api.takeTheirs(settingKey)}>
            {c.takeTheirs}
          </Button>
        </div>
      </div>
    </div>
  );
}

