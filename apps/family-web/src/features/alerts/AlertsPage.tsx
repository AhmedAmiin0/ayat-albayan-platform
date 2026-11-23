import { alertSections, type AlertGroup } from '@ab/client-core';
import type { PortalKind } from '@ab/shared';
import { EmptyState, QueryState, Button, SectionHeader } from '@ab/web-kit/ui';
import { t } from '@ab/web-kit/i18n';
import { useNow } from '@ab/web-kit/time';
import { useViewerTz } from '@ab/web-kit/lib';
import { AlertRow } from './AlertRow';
import { useAlerts, useMarkAlertsRead, type FamilyAlerts } from './alerts-api';

const GROUP_TITLE: Readonly<Record<AlertGroup, () => string>> = {
  today: () => t.portal.app.alerts.today,
  yesterday: () => t.portal.app.alerts.yesterday,
  week: () => t.portal.app.alerts.week,
  older: () => t.portal.app.alerts.older,
};

interface ListProps {
  page: FamilyAlerts;
  kind: PortalKind;
  onRead: (id: string) => void;
}

function AlertList({ page, kind, onRead }: ListProps) {
  const tz = useViewerTz();
  const sections = alertSections(page.items, useNow(), tz);
  if (sections.length === 0) return <EmptyState title={t.bell.empty} />;
  return (
    <>
      {sections.map((section) => (
        <section key={section.group} aria-label={GROUP_TITLE[section.group]()} className="grid gap-2">
          <SectionHeader title={GROUP_TITLE[section.group]()} />
          <ul className="grid gap-2">
            {section.items.map((alert) => (
              <AlertRow key={alert.id} alert={alert} kind={kind} tz={tz} onRead={onRead} />
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

/**
 * «الإشعارات» (canvas Alerts): the rows under اليوم / أمس / هذا الأسبوع / أقدم; a tap marks the
 * row read and opens its report, child or package; «تعليم الكل كمقروء» while any is unread.
 */
export function AlertsPage({ kind }: { kind: PortalKind }) {
  const alerts = useAlerts();
  const markRead = useMarkAlertsRead();
  const unread = (alerts.data?.unread ?? 0) > 0;
  return (
    <section aria-labelledby="alerts-title" className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 id="alerts-title" className="font-display text-h2 font-bold">{t.bell.title}</h1>
        {unread && (
          <Button type="button" variant="ghost" size="sm" onClick={() => markRead.mutate(undefined)}>
            {t.portal.app.alerts.markAll}
          </Button>
        )}
      </div>
      <QueryState query={alerts}>
        {(page) => <AlertList page={page} kind={kind} onRead={(id) => markRead.mutate([id])} />}
      </QueryState>
    </section>
  );
}
