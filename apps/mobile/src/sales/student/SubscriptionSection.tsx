import type { SalesStudentDetails } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more';
import { Button } from '@/core/ui/primitives/Button';
import { SmallHeading as SectionLabel } from '../components/SmallHeading';
import { fill } from '../lib/sales-text';
import { HistoryEntryCard } from '../components/HistoryEntryCard';

/** «الاشتراك»: the current one outlined (the history's card, no money); the past ones collapsed behind «الاشتراكات السابقة (n)». */
export function SubscriptionSection({ data }: { data: Pick<SalesStudentDetails, 'subscriptions' | 'current_id'> }) {
  const [open, setOpen] = useState(false);
  const s = t.sales.student;
  const current = data.subscriptions.find((sub) => sub.id === data.current_id);
  const past = data.subscriptions.filter((sub) => sub.id !== data.current_id);
  return (
    <View style={{ gap: 8 }}>
      <SectionLabel>{s.subscription}</SectionLabel>
      {current ? <HistoryEntryCard entry={current} current brief /> : <Note>{s.noSubscription}</Note>}
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
