import type { SalesPackageSummary } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more';
import { ltr } from '@/core/ui/primitives/Ltr';
import { HistoryEntryCard } from '@/sales/components/HistoryEntryCard';
import { SmallHeading } from '@/sales/components/SmallHeading';
import { fill, riyadhDate } from '@/sales/lib/sales-text';

/**
 * «الاشتراك» of another assistant's student (owner 2026-10-30): the current package's size, status,
 * dates and lessons used / left, and when it should end; never a price or payment. null: «لا يوجد
 * اشتراك بعد»; absent (an old cache): nothing.
 */
export function PackageSection({ summary }: { summary: SalesPackageSummary | null | undefined }) {
  if (summary === undefined) return null;
  const s = t.sales.student;
  const end = summary?.ended_at ? null : summary?.projected_end_at;
  const endLine = end ? fill(t.sales.history.projectedEnd, { date: ltr(riyadhDate(end)) }) : null;
  return (
    <View style={{ gap: 8 }}>
      <SmallHeading>{s.subscription}</SmallHeading>
      {summary ? (
        <HistoryEntryCard entry={summary} current brief />
      ) : (
        <Note>{s.noSubscription}</Note>
      )}
      {endLine ? <Note>{endLine}</Note> : null}
    </View>
  );
}
