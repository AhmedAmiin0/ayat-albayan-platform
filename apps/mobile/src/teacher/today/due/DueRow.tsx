import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useClockCycle, useViewerTz, whenIn } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { AppText } from '@/core/ui/primitives/AppText';
import { type, useTheme } from '@/theme';
import type { DueReport, DueStage } from './due-reports';

const LABEL: Record<DueStage, string> = { write: t.reports.open, resume: t.reports.resume };
const GLYPH = { write: 'hollow', resume: 'half' } as const;

const nameStyle = { fontFamily: type.ui[600], fontSize: type.size.body, lineHeight: 24 } as const;
const whenStyle = { fontFamily: type.ui[400], fontSize: type.size.xs, lineHeight: 20 } as const;

/**
 * One due report (docs/48): the names, when the lesson was, and her act chip «اكتب/أكمل التقرير»;
 * the whole 48pt row opens the report form in «اليوم»'s own stack.
 */
export function DueRow({ row }: { row: DueReport }) {
  const { color } = useTheme();
  const tz = useViewerTz();
  const cycle = useClockCycle();
  const names = row.names.join(t.common.listSeparator);
  const label = LABEL[row.stage];
  const when = whenIn(new Date(row.startsAt), tz, cycle);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} — ${names} · ${when}`}
      onPress={() => router.push(`/teacher/today/report/${row.lessonId}`)}
      style={({ pressed }) => ({
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: pressed ? color.sunk : 'transparent',
      })}
    >
      <View style={{ flex: 1 }}>
        <AppText numberOfLines={1} style={{ ...nameStyle, color: color.ink }}>
          {names}
        </AppText>
        <AppText style={{ ...whenStyle, color: color.ink2, fontVariant: ['tabular-nums'] }}>
          {when}
        </AppText>
      </View>
      <StatusChip tone="act" glyph={GLYPH[row.stage]} label={label} size="sm" />
    </Pressable>
  );
}
