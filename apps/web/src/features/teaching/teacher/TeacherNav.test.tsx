import type { Permission } from '@ab/shared';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { teacherPagesWrapper } from '@/lib/settings/teacher-pages-testing';
import { TeacherNav } from './TeacherNav';

vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/reporting/dashboard/link-mock')).Link }));

const links = () =>
  within(screen.getByRole('navigation', { name: t.teacherNav.label }))
    .getAllByRole('link')
    .map((a) => [a.textContent, a.getAttribute('href')]);

describe('TeacherNav — the teacher top bar (R-TCH-03)', () => {
  it('only my pages, in order: today, my schedule, chats, students, student messages, «أرباحي», «كشوف الشهر», feedback', () => {
    render(<TeacherNav />, { wrapper: teacherPagesWrapper(true) });
    expect(links()).toEqual([
      [t.teacherNav.today, '/teacher'],
      [t.teacherNav.calendar, '/teacher/calendar'],
      [t.teacherNav.chats, '/teacher/inbox'],
      [t.teacherNav.students, '/teacher/students'],
      [t.teacherNav.messages, '/teacher/messages'],
      [t.teacherNav.payouts, '/teacher/earnings'],
      [t.teacherNav.statements, '/teacher/payouts'],
      [t.teacherNav.feedback, '/teacher/feedback'],
    ]);
  });

  it('the academy switches off (the default): the five switched pages are hidden', () => {
    render(<TeacherNav />, { wrapper: teacherPagesWrapper(false) });
    expect(links()).toEqual([
      [t.teacherNav.today, '/teacher'],
      [t.teacherNav.calendar, '/teacher/calendar'],
      [t.teacherNav.students, '/teacher/students'],
    ]);
  });

  it('one switch on shows only that page', () => {
    const wrapper = teacherPagesWrapper(false, { teacher_feedback_enabled: true });
    render(<TeacherNav />, { wrapper });
    expect(links().map(([, href]) => href)).toContain('/teacher/feedback');
    expect(links().map(([, href]) => href)).not.toContain('/teacher/earnings');
  });

  it('«المحادثات» needs both its switch and inbox.read', () => {
    const noInbox = (p: Permission) => p !== 'inbox.read';
    render(<TeacherNav can={noInbox} />, { wrapper: teacherPagesWrapper(true) });
    expect(links().map(([, href]) => href)).not.toContain('/teacher/inbox');
    expect(links().map(([, href]) => href)).toContain('/teacher/messages');
  });
});
