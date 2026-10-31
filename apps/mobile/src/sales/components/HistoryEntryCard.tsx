import type { SalesHistoryEntry, SalesStudentSubscription } from '@ab/shared';
import { View } from 'react-native';
import { useViewerTz } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/core/ui/feedback/Note';
import { partPaidLine } from '@/payments';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { historyLines } from '@/sales/lib/sales-text';
import { SmallHeading } from './SmallHeading';

interface HistoryEntryCardProps {
  entry: SalesHistoryEntry | SalesStudentSubscription;
  current: boolean;
  /** «تفاصيل الطالب» (docs/16 row 36): package, status, dates and lessons only; no status changes, no payments. */
  brief?: boolean;
}

/**
 * One subscription in the history: package and status, dates, lessons used / left, the status changes
 * and the linked payments with date, kind and amount (owner, 2026-10-11). The opened subscription is outlined in lapis.
 */
export function HistoryEntryCard({ entry, current, brief = false }: HistoryEntryCardProps) {
  const { color } = useTheme();
  const h = t.sales.history;
  const tz = useViewerTz();
  const lines = historyLines({ status_changes: [], payments: [], ...entry }, tz);
  const body = { fontFamily: type.ui[400], fontSize: type.size.body, color: color.ink } as const;
  // Only a self.sales_money viewer gets part_paid, and only while 0 < paid < price (owner 2026-10-28).
  const part = 'part_paid' in entry && entry.part_paid ? partPaidLine(entry.part_paid) : null;
  return (
    <View
      style={{
        gap: 6,
        padding: 16,
        borderRadius: 8,
        borderWidth: current ? 2 : 1,
        borderColor: current ? color.lapis : color.rule,
        backgroundColor: color.raised,
      }}
    >
      <AppText accessibilityRole="header" style={{ fontFamily: type.ui[700], fontSize: type.size.base, color: color.ink }}>
        {lines.heading}
      </AppText>
      {current ? <AppText style={{ fontSize: type.size.xs, color: color.lapis }}>{brief ? t.sales.student.current : h.current}</AppText> : null}
      {lines.dates.map((line) => (
        <Note key={line}>{line}</Note>
      ))}
      <AppText style={{ ...body, fontVariant: ['tabular-nums'] }}>{lines.lessons}</AppText>
      {part ? <AppText style={{ ...body, fontVariant: ['tabular-nums'] }}>{part}</AppText> : null}
      {brief ? null : <HistoryEvents lines={lines} />}
    </View>
  );
}

/** The status changes and the linked payments (the history only, never «تفاصيل الطالب»). */
function HistoryEvents({ lines }: { lines: ReturnType<typeof historyLines> }) {
  const { color } = useTheme();
  const h = t.sales.history;
  const body = { fontFamily: type.ui[400], fontSize: type.size.body, color: color.ink } as const;
  return (
    <>
      <SmallHeading>{h.changes}</SmallHeading>
      {lines.changes.length === 0 ? <Note>{h.noChanges}</Note> : null}
      {lines.changes.map((line, i) => (
        <AppText key={`${i}-${line}`} style={body}>
          {line}
        </AppText>
      ))}
      <SmallHeading>{h.payments}</SmallHeading>
      {lines.payments.length === 0 ? <Note>{h.noPayments}</Note> : null}
      {lines.payments.map((line, i) => (
        <AppText key={`${i}-${line}`} style={body}>
          {line}
        </AppText>
      ))}
    </>
  );
}
