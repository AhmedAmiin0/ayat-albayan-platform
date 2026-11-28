import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { CLOCK_STORAGE_KEY } from '@ab/time';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { ApiError, t, opensAtText } from '@ab/web-kit';
import { GuestJoinPage } from './GuestJoinPage';
import { StaffClassroomPage } from './StaffClassroomPage';

const OPENS = '2026-10-03T15:45:00.000Z';
const refused = () => Promise.reject(new ApiError(403, { code: 'join_not_open_yet', opens_at: OPENS }));
const withClient = (node: ReactNode) => (
  <QueryClientProvider client={new QueryClient()}>{node}</QueryClientProvider>
);

async function expect12h() {
  expect((await screen.findByRole('alert')).textContent).toBe(opensAtText(OPENS, '12'));
}

afterEach(() => localStorage.removeItem(CLOCK_STORAGE_KEY));

describe('a too-early join: «تفتح الساعة …» reads 12 h even with a saved 24 h choice', () => {
  it('GuestJoinPage (the lesson link)', async () => {
    localStorage.setItem(CLOCK_STORAGE_KEY, '24');
    render(withClient(<GuestJoinPage linkToken="tok-1" joinWith={refused} />));
    fireEvent.change(screen.getByLabelText(new RegExp(t.classroom.guest.name)), { target: { value: 'سهيلة' } });
    fireEvent.click(screen.getByRole('button', { name: t.classroom.guest.join }));
    await expect12h();
  });

  it('StaffClassroomPage (/classroom/:lessonId)', async () => {
    localStorage.setItem(CLOCK_STORAGE_KEY, '24');
    render(withClient(<StaffClassroomPage lessonId="l-9" join={refused} />));
    await expect12h();
  });
});
