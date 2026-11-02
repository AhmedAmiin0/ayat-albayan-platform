import { formatPhone, WA_LINES, type NotificationsOverview } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/core/ui/feedback/Note';
import { Section } from '@/core/ui/surface/Section';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { ltr } from '@/core/ui/primitives/Ltr';
import { numberLine } from './catalogue-words';
import type { AudienceTab } from '@/ops/notif-rules/lib/audience-tabs';
import { CatalogueAudience } from '@/ops/notif-rules/components/CatalogueAudience';
import { ruleOf } from '@/ops/notif-rules/lib/rule-words';
import { TypedOffSheet } from '@/ops/notif-rules/components/TypedOffSheet';
import { useCatalogueToggles } from '@/ops/notif-rules/hooks/use-catalogue-toggles';
import { useCatalogue } from '@/ops/notif-rules/hooks/use-catalogue';
import { useCanManageNotifications } from '@/ops/notif-rules/hooks/use-toggle-rule';

const c = t.notificationCatalogue;
const r = t.mobileNotificationRules;

/** A v2 answer with at least one row to switch (the intro then says so). */
const anyEditable = (data: NotificationsOverview | undefined): boolean =>
  (data?.entries ?? []).some((e) => ruleOf(e)?.editable === true);

/**
 * «الإشعارات» on the phone (docs/23 §3 phase 1, docs/26b §4): one audience at a time, each
 * notification with its state and the first blocker in words. With notifications.manage and a v2 answer, editable rows get
 * a switch (family ON and essential OFF ask first); otherwise read-only as before. The key carries
 * the settings' fetch time (useCatalogue). `initialAudience` opens on that pill (the overview's rows). The saved line is announced once,
 * by the toggles (announceForAccessibility), not again by a live region.
 */
export function NotificationCatalogue({ initialAudience }: { initialAudience?: AudienceTab } = {}) {
  const query = useCatalogue();
  const manage = useCanManageNotifications();
  const toggles = useCatalogueToggles();
  const data = query.data;
  const editable = manage && anyEditable(data);
  return (
    <Section title={r.title}>
      <Note>{editable ? r.intro : r.readOnlyIntro}</Note>
      {toggles.saved ? <Note>{toggles.saved}</Note> : null}
      {data ? (
        <>
          {WA_LINES.map((line) => {
            const n = numberLine(line, data.lines);
            return <Note key={line}>{`${n.label}: ${n.phone ? ltr(formatPhone(n.phone)) : c.notChecked}`}</Note>;
          })}
          <CatalogueAudience data={data} canManage={manage} toggles={toggles} initialAudience={initialAudience} />
        </>
      ) : query.isError ? (
        <ErrorState message={c.loadError} onRetry={() => void query.refetch()} />
      ) : (
        <Note>{t.common.loading}</Note>
      )}
      {data ? <TypedOffSheet entries={data.entries} toggles={toggles} /> : null}
    </Section>
  );
}
