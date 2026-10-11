import type { SalesHistoryEntry } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { historyLines } from './sales-text';
import { SmallHeading } from './SmallHeading';

/**
 * One subscription in the history: package and status, dates, lessons used / left, the status changes
 * and the linked payments as date + kind only (no money). The opened subscription is outlined in lapis.
 */
export function HistoryEntryCard({ entry, current }: { entry: SalesHistoryEntry; current: boolean }) {
  const { color } = useTheme();
  const h = t.sales.history;
  const lines = historyLines(entry);
  const body = { fontFamily: type.ui[400], fontSize: type.size.body, color: color.ink } as const;
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
      {current ? <AppText style={{ fontSize: type.size.xs, color: color.lapis }}>{h.current}</AppText> : null}
      {lines.dates.map((line) => (
        <Note key={line}>{line}</Note>
      ))}
      <AppText style={{ ...body, fontVariant: ['tabular-nums'] }}>{lines.lessons}</AppText>
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
    </View>
  );
}
