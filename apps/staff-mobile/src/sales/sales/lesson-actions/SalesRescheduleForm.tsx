import type { SalesScheduleLesson } from '@ab/shared';
import { RIYADH_TZ } from '@ab/time';
import { useState } from 'react';
import { View } from 'react-native';
import { ConflictNotice } from '@/booking';
import { t, Button, ErrorLine, MoveReason } from '@ab/mobile-kit';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';
import {
  lessonDuration,
  LessonSlotPicker,
  reasonField,
  RescheduleDone,
  rescheduleFailure,
  RescheduleHeading,
} from '@/teaching';
import { useSalesReschedule } from './lesson-actions-api';

/** One lesson only (docs/16 row 37), same teacher's free slot; a clash answers 409. */
interface SalesRescheduleFormProps {
  lesson: SalesScheduleLesson;
  /** Done closes this sheet and the lesson details under it. */
  onDone: () => void;
}

export function SalesRescheduleForm({ lesson, onDone }: SalesRescheduleFormProps) {
  const cycle = useClockCycle();
  const viewerZone = useViewerTz();
  // docs/34 b: the family's zone; a missing one reads as the academy's (data default).
  const tz = lesson.students[0]?.tz ?? RIYADH_TZ;
  const durationMin = lessonDuration(lesson);
  const move = useSalesReschedule(lesson.id);
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const failure = move.isError ? rescheduleFailure(move.error, cycle, viewerZone) : null;
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
        <LessonSlotPicker lesson={lesson} durationMin={durationMin} tz={tz} value={startsAt} onPick={pick} slotsPath="/sales/booking/slots" />
      )}
      <MoveReason value={reason} onChange={setReason} />
      {failure?.kind === 'error' ? <ErrorLine message={failure.text} /> : null}
      <Button
        label={move.isPending ? t.common.saving : t.lessons.rescheduleSubmit}
        onPress={() => (startsAt ? move.mutate({ startsAt, ...reasonField(reason) }) : undefined)}
        busy={move.isPending}
        disabled={startsAt === null || durationMin === null}
      />
    </View>
  );
}
