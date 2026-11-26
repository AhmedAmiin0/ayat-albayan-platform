import { router } from 'expo-router';
import { pushInTab } from '@/core/nav/back-within';
import { t, Button, ListRow } from '@ab/mobile-kit';
import type { SalesSubscriptionView } from '@ab/shared';
import { useSalesHrefs } from '@/sales/sales/lib/sales-href';
import { startsLine, subscriptionSubtitle } from '@/sales/sales/lib/sales-text';
import { Note } from '@/core/ui/feedback/Note';
import { studentDetailsHref, useTreeBase } from '@/core/nav/tree-base';
import { MoneyActionButton } from '@/sales/sales/money-action';

/** No price or payment; a pending row carries its student's one money action. */
export function SalesSubscriptionRow({
  sub,
  withHistory,
}: {
  sub: SalesSubscriptionView;
  withHistory: boolean;
}) {
  const starts = startsLine(sub);
  const href = useSalesHrefs();
  const base = useTreeBase();
  return (
    <ListRow
      onPress={() => pushInTab(studentDetailsHref(base, sub.student.id))}
      accessibilityHint={t.sales.allStudents.detailsHint}
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
            onPress={() => router.push(href.history(sub.id))}
          />
        ) : (
          <MoneyActionButton student={sub.student} subscriptionId={sub.id} variant="secondary" />
        )
      }
    />
  );
}
