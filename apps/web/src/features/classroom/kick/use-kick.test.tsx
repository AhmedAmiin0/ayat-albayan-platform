import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { tile } from '../fake-client';
import { useKick, type KickOptions } from './use-kick';

const guest = tile({ key: 'g1', name: 'سهيلة', role: 'guest' });

function setup(o: Partial<KickOptions> = {}) {
  const remove = vi.fn<NonNullable<KickOptions['remove']>>(() => Promise.resolve());
  const { result } = renderHook(() => useKick({ lessonId: 'L1', role: 'teacher', remove, ...o }));
  return { result, remove };
}

describe('useKick', () => {
  it('offers the action only on someone else’s camera tile the role may remove, with a lesson id', () => {
    const { result } = setup();
    expect(result.current.canKick(guest)).toBe(true);
    expect(result.current.canKick(tile({ key: 'me', isLocal: true, role: 'guest' }))).toBe(false);
    expect(result.current.canKick(tile({ key: 'a', role: 'admin' }))).toBe(false);
    expect(result.current.canKick(tile({ key: 'x', role: null }))).toBe(false);
    expect(result.current.canKick({ ...guest, kind: 'screen' })).toBe(false);
    expect(setup({ lessonId: null }).result.current.canKick(guest)).toBe(false);
  });

  it('ask → confirm calls the API with the identity and reports success', async () => {
    const { result, remove } = setup();
    act(() => result.current.ask(guest));
    expect(result.current.target).toBe(guest);
    act(() => result.current.confirm());
    expect(remove).toHaveBeenCalledWith({ lessonId: 'L1', identity: 'g1' });
    await waitFor(() => expect(result.current.toast).toEqual({ message: t.classroom.kick.done.replace('{name}', 'سهيلة'), tone: 'info' }));
    expect(result.current.target).toBeNull();
    expect(result.current.busy).toBe(false);
  });

  it('a refused remove becomes an error toast with the code’s words', async () => {
    const { result, remove } = setup();
    remove.mockRejectedValue(new ApiError(403, { code: 'cannot_remove' }));
    act(() => result.current.ask(guest));
    act(() => result.current.confirm());
    await waitFor(() => expect(result.current.toast).toEqual({ message: t.classroom.error.cannot_remove, tone: 'error' }));
    act(() => result.current.dismiss());
    expect(result.current.toast).toBeNull();
  });

  it('cancel clears the target and calls nothing; confirm without a target does nothing', () => {
    const { result, remove } = setup();
    act(() => result.current.confirm());
    act(() => result.current.ask(guest));
    act(() => result.current.cancel());
    expect(result.current.target).toBeNull();
    expect(remove).not.toHaveBeenCalled();
  });
});
