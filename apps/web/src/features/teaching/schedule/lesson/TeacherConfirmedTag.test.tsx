import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { setConfirmationRequired } from '@/lib/settings/confirmation-testing';
import { t } from '@/lib/i18n/i18n';
import { lesson } from './lesson-fixture';
import { LessonDrawer } from './LessonDrawer';
import { TeacherConfirmedTag } from './TeacherConfirmedTag';

vi.mock('@/lib/http/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  apiFetch: vi.fn(),
  apiSend: vi.fn(),
}));

const AHEAD = lesson({ starts_at: '2026-12-06T14:00:00.000Z' });

describe('«أكّد المعلم الحضور» (docs/46 C4)', () => {
  it('shows only when the teacher said «سأحضر»', () => {
    const { rerender } = render(<TeacherConfirmedTag lesson={AHEAD} />);
    expect(screen.queryByText(t.teacherBoard.teacherConfirmed)).toBeNull();
    rerender(<TeacherConfirmedTag lesson={{ ...AHEAD, teacher_confirmed_at: '2026-12-01T10:00:00Z' }} />);
    expect(screen.getByText(t.teacherBoard.teacherConfirmed)).toBeTruthy();
  });

  it('the admin lesson drawer carries it beside the status; the status stays', () => {
    const confirmed = { ...AHEAD, teacher_confirmed_at: '2026-12-01T10:00:00Z' };
    render(
      <QueryClientProvider client={setConfirmationRequired(new QueryClient(), true)}>
        <LessonDrawer lesson={confirmed} onClose={vi.fn()} onDone={vi.fn()} />
      </QueryClientProvider>,
    );
    const drawer = screen.getByRole('dialog');
    expect(within(drawer).getByText(t.teacherBoard.teacherConfirmed)).toBeTruthy();
    // The family-style confirm is still the admin's (D1: the teacher's word changes no status).
    expect(within(drawer).getByRole('button', { name: t.lessons.event.confirm })).toBeTruthy();
  });
});
