import type { Conflict } from '@ab/shared';
import { View } from 'react-native';
import { bookFailure, conflictLine, isCodedRefusal } from '@/booking/booking-errors';
import { ConflictNotice } from '@/booking/ConflictNotice';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { AppText } from '@/core/ui/primitives/AppText';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { NuqtaGlyph } from '@/core/ui/primitives/NuqtaGlyph';
import { type, useTheme } from '@/theme';

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

/**
 * Under the review (R-SCH-04): what the course would clash with in any week, or the course guard's
 * refusal (wrong day count, a course already there…). A clash blocks the assistant (owner
 * 2026-10-18: no override), so its way out is other times. A check that failed otherwise (offline,
 * a server error) offers to run it again, or «احجز» would stay disabled for good.
 */
export function CourseCheckNotice({ check, onChangeSlot }: CourseCheckNoticeProps) {
  const { color } = useTheme();
  const note = { fontFamily: type.ui[500], fontSize: type.size.sm, color: color.ink2 };
  if (check.error) {
    const failure = bookFailure(check.error);
    if (failure.kind === 'conflict') return <ConflictNotice lines={failure.lines} onChangeSlot={onChangeSlot} />;
    if (failure.kind !== 'duplicate' && isCodedRefusal(check.error)) return <ErrorLine message={failure.text} />;
    const message = failure.kind === 'error' ? failure.text : t.common.error;
    return <ErrorState message={message} onRetry={() => void check.refetch()} />;
  }
  if (check.isPending || !check.data) return <AppText style={note}>{t.booking.seriesChecking}</AppText>;
  const conflicts = Array.isArray(check.data.conflicts) ? check.data.conflicts : [];
  if (conflicts.length > 0) return <ConflictNotice lines={conflicts.map(conflictLine)} onChangeSlot={onChangeSlot} />;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <NuqtaGlyph shape="fill" color={color.ok} size={10} />
      <AppText style={note}>{t.booking.seriesFree}</AppText>
    </View>
  );
}
