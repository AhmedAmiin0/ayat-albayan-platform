import { RIYADH_TZ, type SalesScheduleLesson } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { ConflictNotice } from '@/booking';
import { ErrorLine } from '@/inbox';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { lessonDuration, RescheduleDone, rescheduleFailure, RescheduleHeading, SlotPicker } from '@/teaching';
import { useSalesReschedule } from './lesson-actions-api';

/**
 * Sales' «تغيير الموعد» of ONE lesson (docs/16 row 37): who and when now, a free slot of the same
 * teacher (her scoped GET /sales/booking/slots), then the move. This lesson only (no series, no
 * substitute, no booking over a clash: a 409 asks for another slot). The admin's success panel follows;
 * its «تم» closes the lesson's details too (they would show the old time with its actions still live).
 */
interface SalesRescheduleFormProps {
  lesson: SalesScheduleLesson;
  onClose: () => void;
  /** «تم» on the success panel: closes this sheet and «تفاصيل الحلقة» under it. */
  onDone: () => void;
}

export function SalesRescheduleForm({ lesson, onClose, onDone }: SalesRescheduleFormProps) {
  const tz = lesson.students[0]?.tz ?? RIYADH_TZ;
  const durationMin = lessonDuration(lesson);
  const move = useSalesReschedule(lesson.id);
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const failure = move.isError ? rescheduleFailure(move.error) : null;
  const pick = (slot: string | null) => {
    move.reset();
    setStartsAt(slot);
  };
  if (move.data) return <RescheduleDone moved={move.data} scope="one" tz={tz} onClose={onDone} />;
  return (
    <View style={{ gap: 16 }}>
      <RescheduleHeading names={lesson.students.map((s) => s.name).join(t.common.listSeparator)} startsAt={lesson.starts_at} tz={tz} />
      {durationMin === null ? (
        <ErrorLine message={t.reschedule.badDuration} />
      ) : failure?.kind === 'conflict' ? (
        <ConflictNotice lines={failure.lines} onChangeSlot={() => pick(null)} />
      ) : (
        <SlotPicker lesson={lesson} durationMin={durationMin} tz={tz} value={startsAt} onPick={pick} slotsPath="/sales/booking/slots" />
      )}
      {failure?.kind === 'error' ? <ErrorLine message={failure.text} /> : null}
      <Button
        label={move.isPending ? t.common.saving : t.lessons.rescheduleSubmit}
        onPress={() => (startsAt ? move.mutate(startsAt) : undefined)}
        busy={move.isPending}
        disabled={startsAt === null || durationMin === null}
      />
    </View>
  );
}
