import { alertSections } from '@ab/client-core';
import type { PortalKind } from '@ab/shared';
import { EmptyState } from '@ab/web-kit/components/ui/display/empty-state';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { pill } from '@ab/web-kit/family/brand/pill';
import { Hero, HeroTitle } from '@ab/web-kit/family/layout/Hero';
import { PageBody } from '@ab/web-kit/family/layout/PageBody';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useNow } from '@ab/web-kit/lib/time/use-now';
import { useViewerTz } from '@ab/web-kit/lib/viewer-tz';
import { LoadState } from '@ab/web-kit/portal/LoadState';
import { AlertGroupCard } from './AlertGroupCard';
import { useAlerts, useMarkAlertsRead, type FamilyAlerts } from './alerts-api';

interface ListProps {
  page: FamilyAlerts;
  kind: PortalKind;
  onRead: (id: string) => void;
}

function AlertList({ page, kind, onRead }: ListProps) {
  const tz = useViewerTz();
  const sections = alertSections(page.items, useNow(), tz);
  if (sections.length === 0) return <EmptyState title={t.bell.empty} />;
  return sections.map((section) => (
    <AlertGroupCard key={section.group} section={section} row={{ kind, tz, onRead }} />
  ));
}

/** The unread count and «تعليم الكل كمقروء» (boards: the mint pill and the outline pill). */
function Toolbar({ unread, onMarkAll }: { unread: number; onMarkAll: () => void }) {
  if (unread === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="inline-flex min-h-8 items-center gap-2 rounded-full border
        border-fam-mint-rule bg-fam-mint px-3 text-sm font-bold text-fam-mint-ink">
        <span aria-hidden="true" className="size-2 rounded-full bg-lapis" />
        {t.familyLook.pages.alerts.unread.replace('{n}', String(unread))}
      </span>
      <button type="button" className={pill({ tone: 'outline' })} onClick={onMarkAll}>
        <Icon name="check" />
        {t.portal.app.alerts.markAll}
      </button>
    </div>
  );
}

/**
 * «الإشعارات» (boards PortalWebAlerts / PortalWebStudentAlerts): the rows under اليوم / أمس /
 * هذا الأسبوع / أقدم as cards; a tap marks the row read and opens its report, child or package;
 * «تعليم الكل كمقروء» while any is unread.
 */
export function AlertsPage({ kind }: { kind: PortalKind }) {
  const alerts = useAlerts();
  const markRead = useMarkAlertsRead();
  return (
    <>
      <Hero labelledBy="alerts-title">
        <HeroTitle id="alerts-title" title={t.bell.title} line={t.familyLook.pages.alerts.line} />
      </Hero>
      <PageBody>
        <Toolbar unread={alerts.data?.unread ?? 0} onMarkAll={() => markRead.mutate(undefined)} />
        <LoadState query={alerts}>
          {(page) => <AlertList page={page} kind={kind} onRead={(id) => markRead.mutate([id])} />}
        </LoadState>
      </PageBody>
    </>
  );
}
