import type { LessonView } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { lesson } from '@/features/teaching/schedule/lesson/lesson-fixture';
import { ApiError } from '@/lib/http/api';
import { useTeacherCancel } from './use-teacher-cancel';
import { useTeacherConfirm } from './use-teacher-confirm';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  apiSend,
}));

// docs/48 web mutations: «سأحضر» is optimistic, cancel is write-through, only her lists change.
const HOME = ['lessons', 'mine', 'home'];
const WEEK = ['lessons', 'mine', 'week'];
const AHEAD = lesson({ id: 'b', starts_at: '2099-10-05T13:00:00.000Z' });

function setup() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  client.setQueryData(HOME, [AHEAD]);
  client.setQueryData(WEEK, [AHEAD]);
  client.setQueryData(['teachers', 'me'], { id: 't' });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, invalidate, wrapper };
}
const rowOf = (client: QueryClient, key: string[]) => client.getQueryData<LessonView[]>(key)?.[0];
const touchedMe = (invalidate: ReturnType<typeof setup>['invalidate']) =>
  invalidate.mock.calls.some(([f]) => JSON.stringify(f?.queryKey).includes('teachers'));

afterEach(() => apiSend.mockReset());

describe('useTeacherConfirm (optimistic)', () => {
  it('patches both of her lists before the answer, re-reads lessons only', async () => {
    let answer: (v: unknown) => void = () => undefined;
    apiSend.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    const { client, invalidate, wrapper } = setup();
    const { result } = renderHook(() => useTeacherConfirm('b'), { wrapper });
    act(() => result.current.mutate());
    await waitFor(() => expect(rowOf(client, HOME)?.teacher_confirmed_at).toBeTruthy());
    expect(rowOf(client, WEEK)?.teacher_confirmed_at).toBeTruthy();
    act(() => answer({ ...AHEAD, teacher_confirmed_at: '2099-10-01T00:00:00.000Z' }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['lessons'] });
    expect(touchedMe(invalidate)).toBe(false);
  });

  it('a refusal puts the lists back', async () => {
    apiSend.mockRejectedValue(new ApiError(409, { code: 'lesson_started', message: 'x' }));
    const { client, wrapper } = setup();
    const { result } = renderHook(() => useTeacherConfirm('b'), { wrapper });
    act(() => result.current.mutate());
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(rowOf(client, HOME)?.teacher_confirmed_at ?? null).toBeNull();
    expect(rowOf(client, WEEK)?.teacher_confirmed_at ?? null).toBeNull();
  });
});

describe('useTeacherCancel (write-through)', () => {
  it('the answer closes the cached row; no /teachers/me refetch', async () => {
    apiSend.mockResolvedValue({ ...AHEAD, status: 'cancelled_by_teacher', cancel_reason: 'سفر' });
    const { client, invalidate, wrapper } = setup();
    const { result } = renderHook(() => useTeacherCancel('b'), { wrapper });
    act(() => result.current.mutate({ reason: 'سفر' }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const closed = { status: 'cancelled_by_teacher', cancel_reason: 'سفر' };
    expect(rowOf(client, HOME)).toMatchObject(closed);
    expect(rowOf(client, WEEK)?.status).toBe('cancelled_by_teacher');
    expect(touchedMe(invalidate)).toBe(false);
  });

  it('a refusal never flashes a closed row', async () => {
    apiSend.mockRejectedValue(new ApiError(409, { code: 'lesson_started', message: 'x' }));
    const { client, wrapper } = setup();
    const { result } = renderHook(() => useTeacherCancel('b'), { wrapper });
    act(() => result.current.mutate({ reason: 'سفر' }));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(rowOf(client, HOME)?.status).toBe('scheduled');
  });
});
