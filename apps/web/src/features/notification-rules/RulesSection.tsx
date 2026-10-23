import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { NuqtaGlyph } from '@/components/ui/nuqta-glyph';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/features/auth/use-permissions';
import { t } from '@/lib/i18n';
import { settingsQuery } from '@/lib/settings-api';
import { integrationsQuery } from '../integrations/integrations-api';
import { linesCheckQuery } from '../messaging/api';
import { catalogueQuery } from '../notification-catalogue/catalogue-api';
import { NumbersLine } from '../notification-catalogue/NumbersLine';
import { numbersQuery } from '../numbers/numbers-api';
import { RulesContext } from './rules-context';
import { canManageNotifications } from './rules-api';
import { RulesStateStrip } from './RulesStateStrip';
import { RulesTable } from './RulesTable';

const r = t.notificationRules;
const c = t.notificationCatalogue;

/** Loading: row-shaped bars and the words for screen readers; no role (the page owns role=status). */
function Loading() {
  return (
    <div aria-busy="true" className="grid gap-3 py-3">
      <span className="sr-only">{t.common.loading}</span>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className={i % 2 ? 'w-2/3' : 'w-1/2'} />
      ))}
    </div>
  );
}

/**
 * «التواصل» › «الإشعارات» (docs/26b §3, docs/23b): every notification, one audience at a time, each
 * row editable on its own with notifications.manage (timing, channels, number, switch) and read-only
 * without it. GET /admin/notifications (v2: `rule`, `approval`, `reach`), GET /admin/numbers.
 */
export function RulesSection({ onSaved }: { onSaved: (message: string) => void }) {
  const settings = useQuery(settingsQuery);
  const check = useQuery(linesCheckQuery);
  const integrations = useQuery(integrationsQuery);
  const numbers = useQuery(numbersQuery);
  const canManage = canManageNotifications(usePermissions().permissions);
  // Refetched whenever the settings, «التكاملات» or a line check change; first fetch once settings are in.
  const version = settings.dataUpdatedAt + check.dataUpdatedAt + integrations.dataUpdatedAt;
  const list = useQuery({ ...catalogueQuery(version), enabled: settings.isSuccess });
  const api = { canManage, numbers: numbers.data ?? [], reach: list.data?.reach, onSaved };
  return (
    <RulesContext.Provider value={api}>
      <div className="grid min-w-0 gap-2" aria-labelledby="notification-rules-title" role="region">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h3 id="notification-rules-title" className="text-sm font-bold">
            {r.title}
          </h3>
          {!canManage && <span className="rounded-sm border border-rule px-1.5 text-2xs text-ink-3">{r.readOnly}</span>}
        </div>
        {settings.data && <RulesStateStrip settings={settings.data} />}
        <p className="max-w-[70ch] text-xs text-ink-2">{canManage ? r.intro : r.readOnlyHint}</p>
        {list.isPending && <Loading />}
        {list.isError && (
          <div className="grid justify-items-start gap-2">
            <p role="alert" className="flex items-start gap-2 text-sm text-danger">
              <NuqtaGlyph shape="struck" className="mt-1" />
              <span>{c.loadError}</span>
            </p>
            <Button size="sm" variant="secondary" onClick={() => void list.refetch()}>
              {c.retry}
            </Button>
          </div>
        )}
        {list.data && (
          <>
            <NumbersLine lines={list.data.lines} />
            <RulesTable entries={list.data.entries} lines={list.data.lines} />
          </>
        )}
      </div>
    </RulesContext.Provider>
  );
}
