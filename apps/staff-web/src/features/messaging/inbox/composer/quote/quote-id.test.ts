import { afterEach, expect, it } from 'vitest';
import { clearTabMemories } from '@/features/messaging/inbox/shared/tab-memory';
import { quotePins } from './quote-id';

// docs/44 BUG7: the quote's pinned id is per chat, released only by an answer, dropped on sign-out.

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
