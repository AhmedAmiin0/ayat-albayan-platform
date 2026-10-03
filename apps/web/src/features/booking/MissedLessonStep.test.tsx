import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import type { MakeupCandidate } from './contract';
import { MissedLessonStep } from './MissedLessonStep';
import { ABRAR, STUDENT_ID } from './wizard-fixture';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));

const NO_SHOW: MakeupCandidate = {
  lesson_id: 'l-1',
  starts_at: '2026-09-27T14:00:00.000Z',
  status: 'no_show',
  duration_min: 60,
  teacher: { id: ABRAR.id, display_name_ar: 'أبرار' },
};
const EXCUSED: MakeupCandidate = { ...NO_SHOW, lesson_id: 'l-2', starts_at: '2026-09-20T14:00:00.000Z', status: 'excused', duration_min: 30 };
const draft = { students: [{ id: STUDENT_ID, name: 'سهيلة', code: 'AB-0183' }], missed: null, tz: 'Asia/Riyadh', teacher: null };

function renderStep(items: MakeupCandidate[], extra: { preselectId?: string } = {}) {
  apiFetch.mockResolvedValue(items);
  const onChange = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MissedLessonStep draft={draft} onChange={onChange} {...extra} />
    </QueryClientProvider>,
  );
  return onChange;
}

afterEach(() => apiFetch.mockReset());

describe('MissedLessonStep (R-SCH-10)', () => {
  it('lists the student’s missed lessons with time, status and teacher; a pick fixes the length', async () => {
    const onChange = renderStep([NO_SHOW, EXCUSED]);
    expect(await screen.findAllByRole('radio')).toHaveLength(2);
    expect(apiFetch).toHaveBeenCalledWith(`/booking/makeup-candidates?studentId=${STUDENT_ID}`);
    expect(screen.getByText(t.enums.lessonStatus.no_show)).toBeTruthy();
    expect(screen.getByText(t.enums.lessonStatus.excused)).toBeTruthy();
    fireEvent.click(screen.getAllByRole('radio')[1] as HTMLElement);
    expect(onChange).toHaveBeenCalledWith({
      missed: { lessonId: 'l-2', startsAt: EXCUSED.starts_at, teacherId: ABRAR.id, durationMin: 30 },
      durationMin: 30,
      startsAt: null,
    });
  });

  it('the empty state tells the admin to use «غيّر الميعاد» for cancelled lessons', async () => {
    renderStep([]);
    expect(await screen.findByText(t.booking.makeup.none)).toBeTruthy();
  });

  it('a lesson from the drawer’s «حجز تعويضي» is picked once the list loads', async () => {
    const onChange = renderStep([NO_SHOW, EXCUSED], { preselectId: 'l-1' });
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ missed: expect.objectContaining({ lessonId: 'l-1', durationMin: 60 }), durationMin: 60 }));
  });

  it('an id that is no longer a candidate selects nothing', async () => {
    const onChange = renderStep([NO_SHOW], { preselectId: 'gone' });
    await screen.findAllByRole('radio');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('coming from a lesson that already has its makeup, the empty state says that, not «غيّر الميعاد»', async () => {
    renderStep([], { preselectId: 'l-1' });
    expect(await screen.findByText(t.booking.makeup.noneForLesson)).toBeTruthy();
    expect(screen.queryByText(t.booking.makeup.none)).toBeNull();
  });

  it('with other candidates left, the preselected lesson missing is named above the list', async () => {
    renderStep([EXCUSED], { preselectId: 'l-1' });
    expect(await screen.findByText(t.booking.makeup.noneForLesson)).toBeTruthy();
    expect(screen.getAllByRole('radio')).toHaveLength(1);
  });

  it('a failed list shows an alert', async () => {
    apiFetch.mockRejectedValue(new Error('down'));
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MissedLessonStep draft={draft} onChange={vi.fn()} />
      </QueryClientProvider>,
    );
    expect((await screen.findByRole('alert')).textContent).toBe(t.common.error);
  });
});
