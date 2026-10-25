import en from '@ab/shared/i18n/en.json';
import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { history, liveLesson, pupil, teacher } from './academy.fixtures';
import { renderWithQuery } from './academy.test-utils';
import { SalesLive } from './live/SalesLive';
import { SalesTeachers } from './teachers/SalesTeachers';
import { SubscriptionHistory } from './subscriptions/SubscriptionHistory';

vi.mock('@/lib/i18n/i18n', async (orig) => ({ ...(await orig<object>()), t: en }));
vi.mock('@/lib/i18n/locale', async (orig) => ({ ...(await orig<object>()), locale: 'en' }));
const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/dashboard/link-mock')).Link }));

describe('the sales assistant side, English', () => {
  it('teachers, running lessons and a subscription history read in English', async () => {
    apiFetch.mockImplementation(async (path: string) => {
      if (path === '/sales/teachers') return [teacher({ name: 'Abrar', students: [pupil({ name: 'Suhaila' })] })];
      if (path === '/sales/live') return [liveLesson({ teacher_name: 'Abrar', student_names: ['Suhaila'] })];
      if (path.endsWith('/history')) return { ...history(), student: { id: 's1', code: 'AB-0183', name: 'Suhaila' } };
      return {};
    });
    renderWithQuery(
      <>
        <SalesTeachers />
        <SalesLive />
        <SubscriptionHistory id="c1000000-0000-4000-8000-0000000000c1" onClose={() => undefined} />
      </>,
    );
    expect(await screen.findByText('Teachers')).toBeTruthy();
    expect(await screen.findByText('Quran, Arabic language', { exact: false })).toBeTruthy();
    expect(screen.getByText('Lessons running now')).toBeTruthy();
    expect(await screen.findByRole('link', { name: en.classroom.enter })).toBeTruthy();
    expect(await screen.findByText("Suhaila's subscriptions")).toBeTruthy();
    expect(screen.getByText('The opened subscription')).toBeTruthy();
    expect(screen.getAllByText('Linked payments')).toHaveLength(2);
    expect(screen.getByText('1,290').closest('li')?.textContent).toMatch(/Payment.*1,290\s+SAR/);
  });

  it('a teacher reads «Subscribed 1 · Trial 0», the drawer splits the students and shows the fixed link', async () => {
    apiFetch.mockImplementation(async (path: string) => (path === '/sales/teachers' ? [teacher({ name: 'Abrar', students: [pupil({ name: 'Suhaila' })] })] : {}));
    renderWithQuery(<SalesTeachers />);
    fireEvent.click(await screen.findByRole('button', { name: /Subscribed 1 · Trial 0/ }));
    const drawer = screen.getByRole('dialog');
    expect(within(drawer).getByRole('group', { name: 'Student type' }).textContent).toBe('Subscribed1Trial0All1');
    expect(within(drawer).getByText('Suhaila')).toBeTruthy();
    expect(within(drawer).getByText('Fixed lesson link')).toBeTruthy();
    expect(within(drawer).getByRole('link', { name: 'Open link' }).getAttribute('href')).toBe('https://meet.example.org/abrar-fixed');
    expect(within(drawer).getByRole('button', { name: 'Copy link' })).toBeTruthy();
  });
});
