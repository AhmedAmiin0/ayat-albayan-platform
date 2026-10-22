import { formatPhone, WA_LINES, type NotificationsOverview } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';
import { apiFetch } from '@/lib/api';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { Section } from '@/more/Section';
import { ErrorState } from '@/ui/ErrorState';
import { ListRow } from '@/ui/ListRow';
import { ltr } from '@/ui/Ltr';
import { StatusChip } from '@/ui/StatusChip';
import { chipOf, factsOf, numberLine, whenOf } from './catalogue-words';
import { useSettings } from './use-settings';

const c = t.notificationCatalogue;

/**
 * «ماذا يُرسل ومتى» on the phone (docs/23 §3 phase 1): every notification with its state under
 * today's settings and the first blocker in words. Read-only; switches stay on the web. The key
 * carries the settings' fetch time, so a saved field refetches the list.
 */
export function NotificationCatalogue() {
  const version = useSettings().dataUpdatedAt;
  const query = useQuery({
    queryKey: ['admin', 'notifications', version],
    queryFn: () => apiFetch<NotificationsOverview>('/admin/notifications'),
    placeholderData: (previous) => previous,
  });
  const data = query.data;
  return (
    <Section title={c.title}>
      <Note>{`${c.readOnly} · ${c.intro}`}</Note>
      {data ? (
        <>
          {WA_LINES.map((line) => {
            const n = numberLine(line, data.lines);
            return <Note key={line}>{`${n.label}: ${n.phone ? ltr(formatPhone(n.phone)) : c.notChecked}`}</Note>;
          })}
          <View style={{ marginHorizontal: -16 }}>
            {data.entries.map((e) => (
              <ListRow
                key={e.key}
                title={c.entries[e.key].name}
                subtitle={whenOf(e)}
                tags={<Note>{factsOf(e)}</Note>}
                trailing={<StatusChip {...chipOf(e)} size="sm" />}
              />
            ))}
          </View>
        </>
      ) : query.isError ? (
        <ErrorState message={c.loadError} onRetry={() => void query.refetch()} />
      ) : (
        <Note>{t.common.loading}</Note>
      )}
    </Section>
  );
}
