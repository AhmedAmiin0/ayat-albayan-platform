import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { setClockPref } from '@/lib/clock';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { opensAtText } from '../room/livekit/window-hint';
import { GuestJoinPage } from './GuestJoinPage';
import { StaffClassroomPage } from './StaffClassroomPage';

const OPENS = '2026-10-03T15:45:00.000Z';
const refused = () => Promise.reject(new ApiError(403, { code: 'join_not_open_yet', opens_at: OPENS }));
const withClient = (node: ReactNode) => (
  <QueryClientProvider client={new QueryClient()}>{node}</QueryClientProvider>
);

async function expectSwitch() {
  expect((await screen.findByRole('alert')).textContent).toBe(opensAtText(OPENS, '24'));
  act(() => setClockPref('12'));
  expect(screen.getByRole('alert').textContent).toBe(opensAtText(OPENS, '12'));
}

afterEach(() => act(() => setClockPref('24')));

describe('a too-early join: «تفتح الساعة …» follows «تنسيق الوقت» without a remount', () => {
  it('GuestJoinPage (the lesson link)', async () => {
    act(() => setClockPref('24'));
    render(withClient(<GuestJoinPage linkToken="tok-1" joinWith={refused} />));
    fireEvent.change(screen.getByLabelText(new RegExp(t.classroom.guest.name)), { target: { value: 'سهيلة' } });
    fireEvent.click(screen.getByRole('button', { name: t.classroom.guest.join }));
    await expectSwitch();
  });

  it('StaffClassroomPage (/classroom/:lessonId)', async () => {
    act(() => setClockPref('24'));
    render(withClient(<StaffClassroomPage lessonId="l-9" join={refused} />));
    await expectSwitch();
  });
});
