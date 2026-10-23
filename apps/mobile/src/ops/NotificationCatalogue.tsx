import { formatPhone, WA_LINES, type NotificationsOverview } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';
import { apiFetch } from '@/lib/api';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { Section } from '@/more/Section';
import { ErrorState } from '@/ui/ErrorState';
import { ltr } from '@/ui/Ltr';
import { numberLine } from './catalogue-words';
import { CatalogueRow } from './notif-rules/CatalogueRow';
import { ruleOf } from './notif-rules/rule-words';
import { TypedOffSheet } from './notif-rules/TypedOffSheet';
import { useCatalogueToggles } from './notif-rules/use-catalogue-toggles';
import { CATALOGUE_KEY, useCanManageNotifications } from './notif-rules/use-toggle-rule';
import { useSettings } from './use-settings';

const c = t.notificationCatalogue;

/** A v2 answer with at least one row to switch (the intro then says so). */
const anyEditable = (data: NotificationsOverview | undefined): boolean =>
  (data?.entries ?? []).some((e) => ruleOf(e)?.editable === true);

/**
 * «ماذا يُرسل ومتى» on the phone (docs/23 §3 phase 1, docs/26b §4): every notification with its
 * state and the first blocker in words. With notifications.manage and a v2 answer, editable rows get
 * a switch (family ON and essential OFF ask first); otherwise read-only as before. The key carries
 * the settings' fetch time, so a saved field refetches the list.
 */
export function NotificationCatalogue() {
  const version = useSettings().dataUpdatedAt;
  const query = useQuery({
    queryKey: [...CATALOGUE_KEY, version],
    queryFn: () => apiFetch<NotificationsOverview>('/admin/notifications'),
    placeholderData: (previous) => previous,
  });
  const manage = useCanManageNotifications();
  const toggles = useCatalogueToggles();
  const data = query.data;
  const editable = manage && anyEditable(data);
  return (
    <Section title={c.title}>
      <Note>{editable ? t.mobileNotificationRules.intro : `${c.readOnly} · ${c.intro}`}</Note>
      {toggles.saved ? (
        <View accessibilityLiveRegion="polite">
          <Note>{toggles.saved}</Note>
        </View>
      ) : null}
      {data ? (
        <>
          {WA_LINES.map((line) => {
            const n = numberLine(line, data.lines);
            return <Note key={line}>{`${n.label}: ${n.phone ? ltr(formatPhone(n.phone)) : c.notChecked}`}</Note>;
          })}
          <View style={{ marginHorizontal: -16 }}>
            {data.entries.map((e) => (
              <CatalogueRow key={e.key} entry={e} canManage={manage} reach={data.reach} toggles={toggles} />
            ))}
          </View>
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
