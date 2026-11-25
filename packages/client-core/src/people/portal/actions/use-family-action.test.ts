import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../core/http';
import { PORTAL_KEY } from '../portal-api';
import type { PortalLessonSends } from './lesson-sends';
import { createUseFamilyAction, type FamilyActionPorts } from './use-family-action';

const words = { errors: { group_lesson: 'جماعية' } as never, failed: 'تعذّر' };
const mutation = (over: object = {}) => ({
  mutate: vi.fn(), reset: vi.fn(), isPending: false, isError: false, error: null, ...over,
});

const hookWith = (m: ReturnType<typeof mutation>) => {
  const invalidateQueries = vi.fn(async () => undefined);
  const useMutation = vi.fn((_: Parameters<FamilyActionPorts['useMutation']>[0]) => m);
  const ports: FamilyActionPorts = {
    useMutation,
    useQueryClient: () => ({ invalidateQueries }),
    sends: {} as PortalLessonSends,
    words: () => words,
  };
  return { use: createUseFamilyAction(ports), useMutation, invalidateQueries };
};

describe('useFamilyAction, made once for both apps (owner 2026-11-17)', () => {
  it('sends with onDone, and a landed action refreshes every portal read', async () => {
    const m = mutation();
    const h = hookWith(m);
    const done = vi.fn();
    const state = h.use();
    state.send({ kind: 'confirm', studentId: 's1', lessonId: 'l1' }, done);
    expect(m.mutate).toHaveBeenCalledWith(expect.objectContaining({ kind: 'confirm' }), { onSuccess: done });
    await h.useMutation.mock.calls[0]?.[0].onSuccess();
    expect(h.invalidateQueries).toHaveBeenCalledWith({ queryKey: PORTAL_KEY });
    expect([state.busy, state.error]).toEqual([false, null]);
  });

  it('a refusal in the family\'s words', () => {
    const refused = new ApiError(409, { code: 'group_lesson' });
    expect(hookWith(mutation({ isError: true, error: refused })).use().error).toBe('جماعية');
    expect(hookWith(mutation({ isError: true, error: new Error('x') })).use().error).toBe('تعذّر');
  });
});
