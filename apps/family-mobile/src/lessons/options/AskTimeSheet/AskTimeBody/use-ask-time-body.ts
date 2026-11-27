import { useState } from 'react';
import { t, useClockCycle, useSlotWeek, whenText } from '@ab/mobile-kit';
import { useFamilySlots } from '@/portal';
import type { AskTimeBodyProps } from './AskTimeBody.types';

type Setup = Pick<AskTimeBodyProps, 'lesson' | 'student' | 'onSend'>;

export function useAskTimeBody({ lesson, student, onSend }: Setup) {
  const viewer = { tz: student.tz, cycle: useClockCycle() };
  const week = useSlotWeek(lesson.starts_at);
  const ids = { studentId: student.id, lessonId: lesson.id };
  const slots = useFamilySlots({ ...ids, from: week.from, to: week.to });
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const when = whenText(lesson.starts_at, student.tz, viewer);
  return {
    viewer,
    week,
    slots,
    startsAt,
    setStartsAt,
    note,
    setNote,
    current: t.portal.actions.currentWhen.replace('{when}', when),
    send: () => (startsAt ? onSend({ startsAt, note: note.trim() }) : undefined),
  };
}
