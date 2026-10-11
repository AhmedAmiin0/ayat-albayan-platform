import { router } from 'expo-router';
import { t } from '@/lib/i18n';
import { Button } from '@/ui/Button';
import { ListRow } from '@/ui/ListRow';
import type { SalesSubscription } from './sales-api';
import { startsLine, subscriptionSubtitle } from './sales-text';
import { Note } from '@/more/Note';

/**
 * One of my subscriptions: student and code, package · status · lessons, the start day. No price, no
 * payment. A confirmed one carries «السجل» (its student's history, docs/16).
 */
export function SalesSubscriptionRow({ sub, withHistory }: { sub: SalesSubscription; withHistory: boolean }) {
  const starts = startsLine(sub);
  return (
    <ListRow
      title={sub.student.name}
      meta={sub.student.code}
      subtitle={subscriptionSubtitle(sub)}
      tags={starts ? <Note>{starts}</Note> : undefined}
      trailing={
        withHistory ? (
          <Button
            variant="secondary"
            label={t.sales.history.open}
            accessibilityLabel={t.sales.history.openFor.replace('{name}', sub.student.name)}
            onPress={() => router.push(`/more/sales/history/${sub.id}`)}
          />
        ) : undefined
      }
    />
  );
}
