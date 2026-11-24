import type { Conflict } from '@ab/shared';
import { View } from 'react-native';
import { bookFailure, conflictLine, isCodedRefusal, ConflictNotice } from '@/booking';
import { t, AppText, ErrorState, NuqtaGlyph, type, useTheme, ErrorLine } from '@ab/mobile-kit';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';

export interface CourseCheckNoticeProps {
  /** The check's state (useCourseCheck): pending, its clashes, or its refusal. */
  check: {
    isPending: boolean;
    error: unknown;
    data: { conflicts: Conflict[] } | undefined;
    refetch: () => unknown;
  };
  onChangeSlot: () => void;
}

/** R-SCH-04: the assistant has no override; a failed check offers a rerun so booking can go. */
export function CourseCheckNotice({ check, onChangeSlot }: CourseCheckNoticeProps) {
  const cycle = useClockCycle();
  const tz = useViewerTz();
  const { color } = useTheme();
  const note = { fontFamily: type.ui[500], fontSize: type.size.sm, color: color.ink2 };
  if (check.error) {
    const failure = bookFailure(check.error, cycle, tz);
    if (failure.kind === 'conflict') return <ConflictNotice lines={failure.lines} onChangeSlot={onChangeSlot} />;
    if (failure.kind !== 'duplicate' && isCodedRefusal(check.error)) return <ErrorLine message={failure.text} />;
    const message = failure.kind === 'error' ? failure.text : t.common.error;
    return <ErrorState message={message} onRetry={() => void check.refetch()} />;
  }
  if (check.isPending || !check.data) return <AppText style={note}>{t.booking.seriesChecking}</AppText>;
  const conflicts = Array.isArray(check.data.conflicts) ? check.data.conflicts : [];
  if (conflicts.length > 0) return <ConflictNotice lines={conflicts.map((c) => conflictLine(c, cycle, tz))} onChangeSlot={onChangeSlot} />;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <NuqtaGlyph shape="fill" color={color.ok} size={10} />
      <AppText style={note}>{t.booking.seriesFree}</AppText>
    </View>
  );
}
