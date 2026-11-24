import type { SlotView } from '@ab/schedule';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useBookingMode } from '@/features/teaching/booking/mode';
import { slotsQuery } from '@/features/teaching/schedule/api';
import { bookableWindow, currentWeekStart, openingWeek } from '@ab/web-kit/schedule/slots';
import { useViewerTz } from '@ab/web-kit/lib/viewer-tz';
import { WeekSlotsFrame } from '@ab/web-kit/schedule/WeekSlotsFrame';

export interface SlotPickerProps {
  teacherId: string;
  durationMin: number;
  /** Students whose own lessons count as conflicts (GET /booking/slots `studentIds`). */
  studentIds: readonly string[];
  /** Zone of the small times (the first student's). */
  studentTz: string;
  /** starts_at of the picked slot; also opens the grid on that slot's week. */
  value: string | null;
  /** A package's other picked starts: highlighted as picked too (multi-pick). */
  also?: readonly string[];
  onPick: (slot: SlotView) => void;
  /** With nothing picked yet, open on this instant's week (the lesson being moved). */
  near?: string;
  /** The course (subscription id) whose own lessons are not shown busy. */
  excludeCourse?: string;
  /** The trial being moved is not shown busy. */
  excludeLessonId?: string | undefined;
  /** The assistant's move (sales mode): the lesson she moves, whose students the grid names. */
  lessonId?: string | undefined;
}

/** Week-by-week picker over GET /booking/slots (R-SCH-06, R-SCH-07): no past weeks, no typing. */
export function SlotPicker(props: SlotPickerProps) {
  const { teacherId, durationMin, studentIds, studentTz, value, also, onPick, near, excludeCourse, excludeLessonId, lessonId } = props;
  const [now] = useState(() => new Date());
  const tz = useViewerTz();
  const first = currentWeekStart(now, tz);
  const [week, setWeek] = useState(() => openingWeek(value ?? near, { first, tz }));
  const range = bookableWindow(week, now, tz);
  const slots = useQuery({
    ...slotsQuery({ teacherId, durationMin, studentIds, excludeCourse, excludeLessonId, lessonId, from: range?.from ?? now, to: range?.to ?? now }, useBookingMode()),
    enabled: range !== null,
  });
  return (
    <WeekSlotsFrame
      week={week}
      first={first}
      onWeek={setWeek}
      studentTz={studentTz}
      read={{ data: slots.data?.slots, isError: slots.isError, dim: slots.isPlaceholderData }}
      grid={{ value, also, onPick }}
    />
  );
}
