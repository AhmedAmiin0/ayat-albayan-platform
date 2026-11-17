import type { LessonView } from '@ab/shared';
import { SlotPicker, useSlotWeek } from '@ab/mobile-kit';
import { localDate } from '@/today';
import { useRescheduleSlots } from './queries';
import { useViewerClock } from '@/core/lib/clock';

/** What the picker reads of a lesson: the admin's LessonView or sales' schedule lesson. */
type SlotLesson = Pick<LessonView, 'id' | 'starts_at'> & {
  teacher: { id: string };
  students: readonly { id: string }[];
};

export interface LessonSlotPickerProps {
  lesson: SlotLesson;
  durationMin: number;
  /** The family's zone: the small clocks. */
  tz: string;
  /** starts_at of the picked slot. */
  value: string | null;
  onPick: (startsAt: string) => void;
  /** «الحلقة دي وكل اللي بعدها»: only days from the lesson's own day (the API refuses earlier). */
  fromLessonDay?: boolean;
  /** «عدّل الوقت»: 15-minute starts, the lesson itself not counted as busy (useRescheduleSlots). */
  edit?: { stepMin: number; excludeLessonId: string };
  /** Sales: GET /sales/booking/slots (useRescheduleSlots `path`), naming the lesson it moves. */
  slotsPath?: string;
}

/**
 * Staff's «الميعاد الجديد» (R-SCH-07): the kit's SlotPicker on the staff clock, fed by GET
 * /booking/slots (or sales' scoped route) for the shown week: the teacher's candidate starts with
 * their clashes, the lesson's own students included.
 */
export function LessonSlotPicker(props: LessonSlotPickerProps) {
  const { lesson, durationMin, tz, fromLessonDay, edit, slotsPath } = props;
  const viewer = useViewerClock();
  const week = useSlotWeek(lesson.starts_at);
  const slots = useRescheduleSlots({
    teacherId: lesson.teacher.id,
    durationMin,
    studentIds: lesson.students.map((s) => s.id),
    from: week.from,
    to: week.to,
    ...edit,
    ...(slotsPath ? { path: slotsPath, lessonId: lesson.id } : {}),
  });
  const notBefore = fromLessonDay ? localDate(new Date(lesson.starts_at), tz) : '';
  return (
    <SlotPicker
      week={week}
      slots={{ data: slots.data?.slots, isError: slots.isError, refetch: slots.refetch }}
      tz={tz}
      viewer={viewer}
      value={props.value}
      onPick={props.onPick}
      notBefore={notBefore}
    />
  );
}
