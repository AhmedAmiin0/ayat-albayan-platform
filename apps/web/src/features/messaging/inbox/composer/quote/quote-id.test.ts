import { afterEach, expect, it } from 'vitest';
import { clearTabMemories } from '@/features/messaging/inbox/shared/tab-memory';
import { quotePins } from './quote-id';

// docs/44 BUG7 (review of PR #667): «عرض سعر»'s pinned id lives per chat outside the dialog,
// is released only by an answer, and a sign-out drops it and anything settling after it.

afterEach(clearTabMemories);

const A = '+966501234567';

it('pinned after no answer (the dialog may close), released by an answer', () => {
  const gen = quotePins.generation();
  quotePins.pin(A, 'q-1', gen);
  expect(quotePins.pinned(A)).toBe('q-1');
  quotePins.release(A, 'q-1', gen);
  expect(quotePins.pinned(A)).toBeUndefined();
});

it('sign-out forgets it, and an offer settling after it pins nothing', () => {
  const before = quotePins.generation();
  quotePins.pin(A, 'q-1', before);
  clearTabMemories();
  expect(quotePins.pinned(A)).toBeUndefined();
  quotePins.pin(A, 'q-2', before);
  expect(quotePins.pinned(A)).toBeUndefined();
});
