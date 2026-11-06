import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { forgetSenderWake, onSenderWake, resetSenderWake, wakeOn, wakeSender } from './sender-wake';

// docs/42 42-1: jobs that queue rows wake the sender at once; fire and forget, coalesced.

function deferred() {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

/** Lets the wake's microtasks (then / catch / finally) run. */
const flush = () => new Promise<void>((r) => setTimeout(r, 0));

describe('wakeSender (docs/42 42-1)', () => {
  afterEach(() => {
    resetSenderWake();
    vi.restoreAllMocks();
  });

  it('no sender registered: nothing happens, nothing throws', async () => {
    expect(() => wakeSender()).not.toThrow();
    await flush();
  });

  it('one wake = one kick, run after the caller returns (never blocks the job)', async () => {
    const kick = vi.fn(async () => undefined);
    onSenderWake(kick);
    wakeSender();
    expect(kick).not.toHaveBeenCalled();
    await flush();
    expect(kick).toHaveBeenCalledTimes(1);
  });

  it('a burst while a kick is in flight coalesces into ONE more kick after it', async () => {
    const pass = deferred();
    const kick = vi.fn().mockReturnValueOnce(pass.promise).mockResolvedValue(undefined);
    onSenderWake(kick);
    wakeSender();
    await flush();
    for (let i = 0; i < 20; i += 1) wakeSender();
    expect(kick).toHaveBeenCalledTimes(1);
    pass.resolve();
    await flush();
    expect(kick).toHaveBeenCalledTimes(2);
    await flush();
    expect(kick).toHaveBeenCalledTimes(2);
  });

  const rejects = (): Promise<unknown> => Promise.reject(new Error('worker down'));
  const throws = (): Promise<unknown> => {
    throw new Error('boom');
  };

  it.each([
    ['rejects', rejects],
    ['throws at once', throws],
  ])('a kick that %s never reaches the caller; it is logged and the next wake still kicks', async (_n, bad) => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const kick = vi.fn<() => Promise<unknown>>(bad);
    onSenderWake(kick);
    expect(() => wakeSender()).not.toThrow();
    await flush();
    expect(warn).toHaveBeenCalledTimes(1);
    kick.mockResolvedValue(undefined);
    wakeSender();
    await flush();
    expect(kick).toHaveBeenCalledTimes(2);
  });

  it('wakeOn: rows queued → one wake and the count back; zero rows → no wake', async () => {
    const kick = vi.fn(async () => undefined);
    onSenderWake(kick);
    expect(wakeOn(0)).toBe(0);
    await flush();
    expect(kick).not.toHaveBeenCalled();
    expect(wakeOn(3)).toBe(3);
    await flush();
    expect(kick).toHaveBeenCalledTimes(1);
  });

  it('forgetSenderWake(own) forgets the kick (shutdown)', async () => {
    const kick = vi.fn(async () => undefined);
    onSenderWake(kick);
    forgetSenderWake(kick);
    wakeSender();
    await flush();
    expect(kick).not.toHaveBeenCalled();
  });

  it('an app closing after another registered never wipes the newer kick', async () => {
    const a = vi.fn(async () => undefined);
    const b = vi.fn(async () => undefined);
    onSenderWake(a);
    onSenderWake(b);
    forgetSenderWake(a);
    wakeSender();
    await flush();
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);
  });
});
