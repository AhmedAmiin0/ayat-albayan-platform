import type { Conflict } from '@ab/shared';
import { View } from 'react-native';
import { bookFailure, conflictLine } from '@/booking/booking-errors';
import { ConflictNotice } from '@/booking/ConflictNotice';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { NuqtaGlyph } from '@/ui/NuqtaGlyph';
import { type, useTheme } from '@/theme';

export interface CourseCheckNoticeProps {
  /** The check's state (useCourseCheck): pending, its clashes, or its refusal. */
  check: { isPending: boolean; error: unknown; data: { conflicts: Conflict[] } | undefined };
  onChangeSlot: () => void;
}

/**
 * Under the review (R-SCH-04): what the course would clash with in any week, or the course guard's
 * refusal (wrong day count, a course already there…). A clash blocks the assistant (owner
 * 2026-10-18: no override), so its way out is other times.
 */
export function CourseCheckNotice({ check, onChangeSlot }: CourseCheckNoticeProps) {
  const { color } = useTheme();
  const note = { fontFamily: type.ui[500], fontSize: type.size.sm, color: color.ink2 };
  if (check.error) {
    const failure = bookFailure(check.error);
    if (failure.kind === 'conflict') return <ConflictNotice lines={failure.lines} onChangeSlot={onChangeSlot} />;
    return <ErrorLine message={failure.kind === 'duplicate' ? t.common.error : failure.text} />;
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
