import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lesson } from '@/features/schedule/lesson-fixture';
import { t } from '@/lib/i18n';
import { TeacherLessonCard } from './TeacherLessonCard';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiSend }));

const MONDAY = lesson({ id: 'b', starts_at: '2026-10-05T13:00:00.000Z', status: 'confirmed' });

describe('TeacherLessonCard — «اقترح موعدًا آخر» on phones (< 640px)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-03T09:00:00.000Z'));
    const query = (media: string) => ({ matches: media === '(max-width: 39.99rem)', addEventListener: vi.fn(), removeEventListener: vi.fn() });
    vi.stubGlobal('matchMedia', vi.fn(query));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    apiSend.mockReset();
  });

  it('the form opens in a full-screen dialog instead of inside the card, and sends from there', async () => {
    apiSend.mockResolvedValue(MONDAY);
    const onDone = vi.fn();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <TeacherLessonCard lesson={MONDAY} tz="Africa/Cairo" fallbackLink={null} onDone={onDone} />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: t.teacherDash.proposeReschedule }));
    const sheet = within(screen.getByRole('dialog', { name: t.teacherDash.propose.title }));
    expect(sheet.getByRole('form', { name: t.teacherDash.propose.title })).toBeTruthy();
    fireEvent.change(sheet.getByLabelText(t.teacherDash.propose.date), { target: { value: '2026-10-06' } });
    fireEvent.click(sheet.getByRole('button', { name: t.teacherDash.propose.submit }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(t.teacherDash.propose.sent));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('«رجوع» closes the dialog and the opener stays in the card', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <TeacherLessonCard lesson={MONDAY} tz="Africa/Cairo" fallbackLink={null} onDone={vi.fn()} />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: t.teacherDash.proposeReschedule }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: t.teacherDash.propose.back }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: t.teacherDash.proposeReschedule })).toBeTruthy();
  });
});
