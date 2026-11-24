import type { SalesStudentDetails } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { t, Button, pathKey } from '@ab/mobile-kit';
import { Note } from '@/more';
import { SmallHeading as SectionLabel } from '@/sales/sales/components/SmallHeading';
import { fill } from '@/sales/sales/lib/sales-text';
import { HistoryEntryCard } from '@/sales/sales/components/HistoryEntryCard';
import { StartDateEdit, UsedBeforeEdit } from '@/subscribe';

/** No money; the current one outlined and past ones collapsed. */
export function SubscriptionSection({ data }: { data: Pick<SalesStudentDetails, 'subscriptions' | 'current_id'> }) {
  const [open, setOpen] = useState(false);
  const s = t.sales.student;
  const current = data.subscriptions.find((sub) => sub.id === data.current_id);
  const past = data.subscriptions.filter((sub) => sub.id !== data.current_id);
  return (
    <View style={{ gap: 8 }}>
      <SectionLabel>{s.subscription}</SectionLabel>
      {current ? <HistoryEntryCard entry={current} current brief /> : <Note>{s.noSubscription}</Note>}
      {current ? <UsedBeforeEdit sub={current} stale={[pathKey('/sales')]} /> : null}
      {current ? <StartDateEdit sub={current} stale={[pathKey('/sales')]} /> : null}
      {past.length > 0 ? (
        <Button
          variant="secondary"
          label={open ? s.hidePast : fill(s.showPast, { n: String(past.length) })}
          onPress={() => setOpen(!open)}
        />
      ) : null}
      {open ? past.map((sub) => <HistoryEntryCard key={sub.id} entry={sub} current={false} brief />) : null}
    </View>
  );
}
