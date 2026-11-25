import type { BookingMode } from '@ab/client-core';
import type { QueryKey } from '@tanstack/react-query';

const all = ['lessons'] as const;
const trialDates = [...all, 'trial-dates'] as const;

// Every lesson write invalidates `all`, so the overview, the free slots, the proposals, the trial
// dates and the teacher's own lessons, attendance and student heads refresh together.
export const lessonKeys = {
  all,
  trialDates,
  overview: (query: string): QueryKey => [...all, 'overview', query],
  slots: (mode: BookingMode, query: string): QueryKey => [...all, 'slots', mode, query],
  outsideSlots: (mode: BookingMode, query: string): QueryKey => [
    ...all,
    'outside-slots',
    mode,
    query,
  ],
  proposals: (): QueryKey => [...all, 'proposals'],
  mine: (query: string): QueryKey => [...all, 'mine', query],
  attendance: (studentId: string, month: string | null): QueryKey => [
    ...all,
    'attendance',
    studentId,
    month ?? 'current',
  ],
  teacherStudent: (studentId: string): QueryKey => [...all, 'teacher-student', studentId],
  trialHistory: (mode: BookingMode, studentId: string): QueryKey => [
    ...trialDates,
    mode,
    studentId,
  ],
};
