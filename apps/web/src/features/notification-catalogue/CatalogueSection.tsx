import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { NuqtaGlyph } from '@/components/ui/nuqta-glyph';
import { Skeleton } from '@/components/ui/skeleton';
import { t } from '@/lib/i18n';
import { settingsQuery } from '@/lib/settings-api';
import { integrationsQuery } from '../integrations/integrations-api';
import { linesCheckQuery } from '../messaging/api';
import { catalogueQuery } from './catalogue-api';
import { CatalogueTable } from './CatalogueTable';
import { NumbersLine } from './NumbersLine';

const c = t.notificationCatalogue;

/** Loading: row-shaped bars and the words for screen readers; no role (the settings page owns role=status). */
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
 * «ماذا يُرسل ومتى» (docs/23 §3 phase 1, §E H1): every notification the platform sends, to whom,
 * when, through which channel and number, and whether it goes out now under today's settings
 * (the first blocker in words), one audience at a time (docs/26b §3). Read-only: the switches stay
 * on «الإرسال» of «التواصل».
 */
export function CatalogueSection() {
  const settings = useQuery(settingsQuery);
  const check = useQuery(linesCheckQuery);
  const integrations = useQuery(integrationsQuery);
  // Refetched whenever the settings, «التكاملات» or a line check change; first fetch once settings are in.
  const version = settings.dataUpdatedAt + check.dataUpdatedAt + integrations.dataUpdatedAt;
  const list = useQuery({ ...catalogueQuery(version), enabled: settings.isSuccess });
  return (
    <div className="grid min-w-0 gap-2 border-t border-rule pt-4" aria-labelledby="notification-catalogue-title" role="region">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h3 id="notification-catalogue-title" className="text-sm font-bold">
          {c.title}
        </h3>
        <span className="rounded-sm border border-rule px-1.5 text-2xs text-ink-3">{c.readOnly}</span>
      </div>
      <p className="max-w-[70ch] text-xs text-ink-2">{c.intro}</p>
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
          <CatalogueTable entries={list.data.entries} lines={list.data.lines} />
        </>
      )}
    </div>
  );
}
