import type { BookedCourse, CourseChangeView } from '@ab/shared';
import { fireEvent, screen, within } from '@testing-library/react';
import type { Mock } from 'vitest';
import { t } from '@/lib/i18n';
import { ABRAR } from '../wizard-fixture';

// Test data only: «تغيير أيام الحلقات» (owner 2026-10-18). Now is Saturday 3 October 2026, 12:00 Riyadh.

export const NOW = '2026-10-03T09:00:00.000Z';
export const SUN = '2026-10-04T14:00:00.000Z'; // Sunday 17:00 Riyadh (a current day)
export const WED = '2026-10-07T16:30:00.000Z'; // Wednesday 19:30 (a current day)
export const MON = '2026-10-05T15:00:00.000Z'; // Monday 18:00 (a new day)

export const COURSE: BookedCourse = {
  subscriptionId: '7d3c2b1a-0f9e-4d8c-8b7a-6a5b4c3d2e1f',
  teacherId: ABRAR.id,
  teacherTz: 'Africa/Cairo',
  durationMin: 45,
  tz: 'Asia/Riyadh',
  startsOn: '2026-09-06',
  endsOn: '2026-10-28',
  days: [
    { weekday: 0, startTimeLocal: '17:00' },
    { weekday: 3, startTimeLocal: '19:30' },
  ],
  lessonsTotal: 8,
  perWeek: 2,
};

export const CHANGE_VIEW: CourseChangeView = {
  student: { id: '0b6a7c1e-2222-4a8e-9b00-000000000002', name: 'سهيلة', code: 'AB-0183', tz: 'Asia/Riyadh' },
  course: COURSE,
};

export const CHECK = { conflicts: [], remaining: 5, endsOn: '2026-10-21' };
export const CLASH = { kind: 'teacher_busy', startsAt: MON, endsAt: MON };

/** apiFetch: the teacher's free slots (the current days and Monday 18:00) under either base; the admin's view. */
export function routeChange(apiFetch: Mock): void {
  const slots = { teacher_tz: 'Africa/Cairo', step_min: 45, slots: [SUN, MON, WED].map((at) => ({ starts_at: at, ends_at: at, conflicts: [] })) };
  apiFetch.mockImplementation((path: string) => {
    if (path.startsWith('/booking/course/change')) return Promise.resolve(CHANGE_VIEW);
    if (path.includes('/booking/slots')) return Promise.resolve(slots);
    if (path.startsWith('/invoices')) return Promise.resolve([]);
    return Promise.reject(new Error(`unmocked ${path}`));
  });
}

/** apiSend: …/change/check answers `check`, …/change takes the next answer (an Error rejects). */
export function routeChangeSend(apiSend: Mock, check: unknown, answers: unknown[] = []): void {
  apiSend.mockImplementation((_m: string, path: string) => {
    if (path.endsWith('/change/check')) return Promise.resolve(check);
    const answer = answers.shift() ?? { subscriptionId: COURSE.subscriptionId, ruleIds: ['r-9'], endsOn: CHECK.endsOn };
    return answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer);
  });
}

/** The bodies of every POST …/change (checks left out). */
export const changeBodies = (apiSend: Mock): Record<string, unknown>[] =>
  apiSend.mock.calls.filter(([, path]) => String(path).endsWith('/change')).map(([, , body]) => body as Record<string, unknown>);

/** On the picker: Monday 18:00 instead of Sunday (so «التالي» has a change to check). */
export async function swapSundayForMonday(): Promise<void> {
  const monday = await screen.findByRole('region', { name: new RegExp(`^${t.enums.weekday[1]} `) });
  fireEvent.click(within(monday).getByRole('button', { name: /18:00/ }));
  fireEvent.click(screen.getByRole('button', { name: t.booking.removeDay.replace('{day}', t.enums.weekday[0]) }));
}
