import { describe, expect, it, vi } from 'vitest';
import { createPinStore } from './pin-store.js';
import { replayedOther } from './unconfirmed.js';

const A = '+966501234567';

describe('createPinStore: the pinned id is released only by an answer', () => {
  it('pins on no answer, keeps it for every next send, releases it for that id only', () => {
    const s = createPinStore();
    const gen = s.generation();
    expect(s.pinned(A)).toBeUndefined();
    s.pin(A, 'req-1', gen);
    expect(s.pinned(A)).toBe('req-1');
    expect(s.pinned('+966507654321')).toBeUndefined();
    s.release(A, 'other', gen);
    expect(s.pinned(A)).toBe('req-1');
    s.release(A, 'req-1', gen);
    expect(s.pinned(A)).toBeUndefined();
  });

  it('a send that settles after sign-out neither pins nor releases', () => {
    const s = createPinStore();
    const before = s.generation();
    s.pin(A, 'req-1', before);
    s.clear();
    expect(s.pinned(A)).toBeUndefined();
    s.pin(A, 'req-2', before);
    expect(s.pinned(A)).toBeUndefined();
    s.pin(A, 'req-3', s.generation());
    s.release(A, 'req-3', before);
    expect(s.pinned(A)).toBe('req-3');
  });

  it('the replay note is per chat, tells its listeners, and goes on sign-out', () => {
    const s = createPinStore();
    const heard = vi.fn();
    const stop = s.subscribe(heard);
    s.setReplayed(A, true);
    expect([s.replayed(A), s.replayed('+966507654321')]).toEqual([true, false]);
    s.setReplayed(A, false);
    expect(s.replayed(A)).toBe(false);
    s.setReplayed(A, true);
    s.clear();
    expect(s.replayed(A)).toBe(false);
    expect(heard).toHaveBeenCalledTimes(4);
    stop();
  });
});

it('a replay answered with another body is the first message, not the edit', () => {
  expect(replayedOther({ body: 'وصلت' }, 'وصلت الآن')).toBe(true);
  expect(replayedOther({ body: 'وصلت' }, 'وصلت')).toBe(false);
  // The server only trims: a real send echoes the same words.
  expect(replayedOther({ body: 'وصلت' }, '  وصلت\n')).toBe(false);
  expect(replayedOther({ body: null }, 'وصلت')).toBe(true);
});
