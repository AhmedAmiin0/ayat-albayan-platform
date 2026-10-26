import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { TeacherNav } from './TeacherNav';

vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/reporting/dashboard/link-mock')).Link }));

describe('TeacherNav — the teacher top bar (R-TCH-03)', () => {
  it('only my pages, in order: today, my schedule, chats, students, reports, «أرباحي», «كشوف الشهر», feedback', () => {
    render(<TeacherNav />);
    const nav = screen.getByRole('navigation', { name: t.teacherNav.label });
    const links = within(nav).getAllByRole('link').map((a) => [a.textContent, a.getAttribute('href')]);
    expect(links).toEqual([
      [t.teacherNav.today, '/teacher'],
      [t.teacherNav.calendar, '/teacher/calendar'],
      [t.teacherNav.chats, '/teacher/inbox'],
      [t.teacherNav.students, '/teacher/students'],
      [t.teacherNav.reports, '/teacher/reports'],
      [t.teacherNav.payouts, '/teacher/earnings'],
      [t.teacherNav.statements, '/teacher/payouts'],
      [t.teacherNav.feedback, '/teacher/feedback'],
    ]);
  });
});
