import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setConfirmationRequired } from '@/lib/settings/confirmation-testing';
import { t } from '@/lib/i18n/i18n';
import { lesson } from './lesson-fixture';
import { LessonActions } from './LessonActions';

vi.mock('@/lib/http/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  apiFetch: vi.fn(),
  apiSend: vi.fn(),
}));

const START = '2026-12-06T14:00:00.000Z';

function renderActions(teacher?: boolean) {
  render(
    <QueryClientProvider client={setConfirmationRequired(new QueryClient(), true)}>
      <LessonActions lesson={lesson({ starts_at: START })} onDone={vi.fn()} teacher={teacher} />
    </QueryClientProvider>,
  );
}

describe('LessonActions `teacher` (docs/46 D1, docs/48 Q4: the teacher card)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-12-06T13:59:30.000Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('the admin keeps the family-style confirm and the early «اعتذر مسبقًا»', () => {
    renderActions();
    expect(screen.getByRole('button', { name: t.lessons.event.confirm })).toBeTruthy();
    expect(screen.getByRole('button', { name: t.lessons.event.excuse })).toBeTruthy();
  });

  it('the teacher card hides both before the start', () => {
    renderActions(true);
    expect(screen.queryByRole('button', { name: t.lessons.event.confirm })).toBeNull();
    expect(screen.queryByRole('button', { name: t.lessons.event.excuse })).toBeNull();
  });

  it('the outcomes appear at starts_at with no remount', () => {
    renderActions(true);
    expect(screen.queryByRole('group', { name: t.teacherDash.markAttendance })).toBeNull();
    act(() => {
      vi.setSystemTime(new Date('2026-12-06T14:00:30.000Z'));
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(screen.getByRole('group', { name: t.teacherDash.markAttendance })).toBeTruthy();
  });
});
