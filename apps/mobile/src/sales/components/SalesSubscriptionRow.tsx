import { router } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { ListRow } from '@/core/ui/layout/ListRow';
import type { SalesSubscription } from '../lib/sales-api';
import { useSalesHrefs } from '../lib/sales-href';
import { startsLine, subscriptionSubtitle } from '../lib/sales-text';
import { Note } from '@/more/Note';
import { studentDetailsHref, useTreeBase } from '@/core/nav/tree-base';
import { MoneyActionButton } from '../money-action';

/**
 * One of my subscriptions: student and code, package · status · lessons, the start day. No price, no
 * payment. A confirmed one carries «السجل» (its student's history, docs/16); the row opens the student's
 * details like every student row (owner 2026-10-28). A pending one carries its student's one money action
 * instead («تسجيل تحويل» for its owed package, else «تجديد»; UX review #9), when there is one.
 */
export function SalesSubscriptionRow({ sub, withHistory }: { sub: SalesSubscription; withHistory: boolean }) {
  const starts = startsLine(sub);
  const href = useSalesHrefs();
  const base = useTreeBase();
  return (
    <ListRow
      onPress={() => router.push(studentDetailsHref(base, sub.student.id))}
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
