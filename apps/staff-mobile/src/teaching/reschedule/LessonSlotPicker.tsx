import { localDateIn, type LessonView } from '@ab/shared';
import { SlotPicker, useSlotWeek } from '@ab/mobile-kit';
import { useRescheduleSlots } from './queries';
import { useViewerClock } from '@/core/lib/clock';

/** What the picker reads of a lesson: the admin's LessonView or sales' schedule lesson. */
type SlotLesson = Pick<LessonView, 'id' | 'starts_at'> & {
  teacher: { id: string };
  students: readonly { id: string }[];
};

interface LessonSlotPickerProps {
  lesson: SlotLesson;
  durationMin: number;
  /** The family's zone: the small clocks. */
  tz: string;
  /** starts_at of the picked slot. */
  value: string | null;
  onPick: (startsAt: string) => void;
  /** Only days from the lesson's own day, since the API refuses earlier ones. */
  fromLessonDay?: boolean;
  /** 15-minute starts; the lesson itself does not count as busy. */
  edit?: { stepMin: number; excludeLessonId: string };
  /** Sales: GET /sales/booking/slots (useRescheduleSlots `path`), naming the lesson it moves. */
  slotsPath?: string;
}

/** Staff slot picker (R-SCH-07); the lesson's own students count for clashes. */
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
  const notBefore = fromLessonDay ? localDateIn(new Date(lesson.starts_at), tz) : '';
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
