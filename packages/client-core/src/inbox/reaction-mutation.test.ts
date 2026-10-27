import type { MessageView, ReactionResult } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import { reactionMutation, withReactions } from './reaction-mutation.js';

const before = { theirs: '❤️', ours: null, ours_by: null };
const m = { id: 'm1', reactions: before } as unknown as MessageView;
const result = (status: 'sent' | 'failed', ours: string | null): ReactionResult =>
  ({ message: { ...m, reactions: { ...before, ours, ours_by: ours ? 'هبة' : null } }, status, error_code: null, error_text: null }) as ReactionResult;

function ports() {
  return { send: vi.fn(), cancel: vi.fn(async () => undefined), patch: vi.fn(), fail: vi.fn() };
}

describe('reactionMutation', () => {
  it('ours at once, then the server’s answer', async () => {
    const p = ports();
    const o = reactionMutation(p);
    await o.onMutate({ message: m, emoji: '👍' });
    expect(p.cancel).toHaveBeenCalled();
    expect(p.patch).toHaveBeenLastCalledWith('m1', { theirs: '❤️', ours: '👍', ours_by: null });
    o.onSuccess(result('sent', '👍'));
    expect(p.patch).toHaveBeenLastCalledWith('m1', { theirs: '❤️', ours: '👍', ours_by: 'هبة' });
    expect(p.fail).not.toHaveBeenCalled();
  });

  it('a send WhatsApp failed: the reverted bubble and a failure', () => {
    const p = ports();
    reactionMutation(p).onSuccess(result('failed', null));
    expect(p.patch).toHaveBeenLastCalledWith('m1', { ...before, ours: null, ours_by: null });
    expect(p.fail).toHaveBeenCalledWith(null);
  });

  it('a refused request puts the bubble back as it was', () => {
    const p = ports();
    const e = new Error('409');
    reactionMutation(p).onError(e, { message: m, emoji: '👍' });
    expect(p.patch).toHaveBeenLastCalledWith('m1', before);
    expect(p.fail).toHaveBeenCalledWith(e);
  });
});

describe('withReactions', () => {
  it('patches the message in its page; no cache stays none', () => {
    const data = { pages: [{ messages: [m] }], pageParams: [''] };
    expect(withReactions(data, { id: 'm1', reactions: { ...before, ours: '🙏' } })?.pages[0]?.messages[0]?.reactions?.ours).toBe('🙏');
    expect(withReactions(undefined, { id: 'm1', reactions: before })).toBeUndefined();
  });
});
