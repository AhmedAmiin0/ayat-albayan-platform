import { Button, t, QueryState } from '@ab/web-kit';
import { AlertList } from './AlertList';
import type { AlertsPageProps } from './AlertsPage.types';
import { useAlertsPage } from './use-alerts-page';

/** A tap marks the row read and opens its report, child or package. */
export function AlertsPage({ kind }: AlertsPageProps) {
  const { alerts, unread, markAll, readOne } = useAlertsPage();
  return (
    <section aria-labelledby="alerts-title" className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 id="alerts-title" className="font-display text-h2 font-bold">
          {t.bell.title}
        </h1>
        {unread && (
          <Button type="button" variant="ghost" size="sm" onClick={markAll}>
            {t.portal.app.alerts.markAll}
          </Button>
        )}
      </div>
      <QueryState query={alerts}>
        {(page) => <AlertList page={page} kind={kind} onRead={readOne} />}
      </QueryState>
    </section>
  );
}
