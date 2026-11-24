import type { AudienceTab } from '@ab/shared';
import type { NotificationsOverview } from '@ab/shared';
import { WA_LINES } from '@ab/catalog';
import { formatPhone } from '@ab/core';
import { t, ErrorState, ltr, Section } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { numberLine } from './catalogue-words';
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

/** docs/23 §3, docs/26b §4: switches need notifications.manage and v2; save announced once. */
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
