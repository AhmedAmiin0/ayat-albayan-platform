import { describe, expect, it, vi } from 'vitest';
import { forgetTabMemories, onSessionEnd } from './session-end';

describe('session end', () => {
  it('forgets every registered memory, each once per call', () => {
    const drafts = vi.fn();
    const sends = vi.fn();
    onSessionEnd(drafts);
    onSessionEnd(sends);
    onSessionEnd(drafts);
    forgetTabMemories();
    expect(drafts).toHaveBeenCalledTimes(1);
    expect(sends).toHaveBeenCalledTimes(1);
  });
});
