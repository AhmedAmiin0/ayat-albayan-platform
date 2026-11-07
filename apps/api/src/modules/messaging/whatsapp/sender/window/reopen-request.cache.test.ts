import { beforeEach, describe, expect, it } from 'vitest';
import { windowFakes } from './window.fakes';

// docs/42 42-3: the composer's note (every thread load) reads the 60 s template copy; the reopen
// template a held text queues is still read fresh (docs/42 §6).

describe('ReopenRequest — cached note, fresh send', () => {
  let f: ReturnType<typeof windowFakes>;
  beforeEach(() => {
    f = windowFakes();
  });

  it('usable() reads the cached copy only', async () => {
    await expect(f.request.usable()).resolves.toBe('template');
    expect(f.approvedCached).toHaveBeenCalledWith('welcome_greeting');
  });

  it('template() (the queue) reads the registry fresh, never the copy', async () => {
    await f.request.template();
    expect(f.approved).toHaveBeenCalledWith('welcome_greeting');
    expect(f.approvedCached).not.toHaveBeenCalled();
  });
});
