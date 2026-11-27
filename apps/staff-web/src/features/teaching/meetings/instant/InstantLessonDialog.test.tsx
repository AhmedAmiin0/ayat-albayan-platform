import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, t } from '@ab/web-kit';
import { studentListItemFixture } from '@ab/shared/testing';
import { InstantLessonDialog } from './InstantLessonDialog';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const STUDENT = studentListItemFixture({
  id: 's-1',
  code: 'AB-0001',
  name: 'سهيلة محمد',
  guardian_phone: '',
});
const TEACHER_ID = 'e8888888-8888-4888-8888-888888888881';
const TEACHER = {
  id: TEACHER_ID,
  display_name_ar: 'أبرار',
  gender: 'female',
  programs: ['quran'],
  tz: 'Asia/Riyadh',
  meeting_link: null,
  platform_classroom: false,
  students_count: 1,
  max_students: null,
  has_availability: true,
};
const CLASH = { kind: 'teacher_busy', startsAt: '2026-10-05T13:07:00.000Z', endsAt: '2026-10-05T13:37:00.000Z', lessonId: 'x' };

const onStarted = vi.fn();
const show = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <InstantLessonDialog onClose={vi.fn()} onStarted={onStarted} />
    </QueryClientProvider>,
  );

async function pickStudentAndTeacher() {
  fireEvent.change(screen.getByRole('textbox', { name: t.common.search }), { target: { value: 'سهيلة' } });
  fireEvent.submit(screen.getByRole('search'));
  fireEvent.click(await screen.findByRole('checkbox'));
  const select = screen.getByLabelText(new RegExp(t.meetings.teacher));
  await screen.findByRole('option', { name: 'أبرار' });
  fireEvent.change(select, { target: { value: TEACHER_ID } });
}

describe('InstantLessonDialog «حلقة فورية»', () => {
  beforeEach(() => {
    apiFetch.mockImplementation(async (path: string) =>
      path.startsWith('/students') ? { items: [STUDENT], total: 1, page: 1, pageSize: 25 } : [TEACHER],
    );
  });
  afterEach(() => {
    cleanup();
    apiFetch.mockReset();
    apiSend.mockReset();
    onStarted.mockReset();
  });

  it('asks for a student first', () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: t.meetings.start }));
    expect(screen.getByText(t.meetings.noStudents)).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('starts the lesson for the picked student and teacher, then goes into the room', async () => {
    apiSend.mockResolvedValue({ lessonId: 'l-9' });
    show();
    await pickStudentAndTeacher();
    fireEvent.click(screen.getByRole('button', { name: t.meetings.start }));
    await vi.waitFor(() => expect(onStarted).toHaveBeenCalledWith('l-9'));
    const [method, path, body] = apiSend.mock.calls[0] ?? [];
    expect([method, path]).toEqual(['POST', '/lessons/instant']);
    expect(body).toMatchObject({ studentIds: ['s-1'], teacherId: TEACHER_ID, durationMin: 30 });
    expect(body.override).toBeUndefined();
  });

  it('a clash lists the conflicts and needs a reason to start anyway', async () => {
    apiSend.mockRejectedValueOnce(new ApiError(409, { code: 'conflict', conflicts: [CLASH] }));
    apiSend.mockResolvedValueOnce({ lessonId: 'l-10' });
    show();
    await pickStudentAndTeacher();
    fireEvent.click(screen.getByRole('button', { name: t.meetings.start }));
    expect(await screen.findByText(t.meetings.conflict)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.meetings.start }));
    expect(apiSend).toHaveBeenCalledTimes(1);
    fireEvent.change(screen.getByLabelText(new RegExp(t.meetings.overrideReason)), { target: { value: 'طارئ' } });
    fireEvent.click(screen.getByRole('button', { name: t.meetings.start }));
    await vi.waitFor(() => expect(onStarted).toHaveBeenCalledWith('l-10'));
    expect(apiSend.mock.calls[1]?.[2]).toMatchObject({ override: { reason: 'طارئ' } });
    expect(apiSend.mock.calls[1]?.[2].clientRequestId).toBe(
      apiSend.mock.calls[0]?.[2].clientRequestId,
    );
  });
});
