import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearAllDrafts, clearDraft, draftGeneration, getDraft, requestIdFor, setDraft, subscribeDrafts } from './draft-store';

const A = '+966501234567';
const B = '+966507654321';

afterEach(clearAllDrafts);

describe('the reply draft per chat', () => {
  it('set then get returns the same draft', () => {
    setDraft(A, { text: 'السلام عليكم', failed: null });
    expect(getDraft(A)).toEqual({ text: 'السلام عليكم', failed: null });
  });

  it('an unknown chat is the same empty draft every time (a stable snapshot)', () => {
    expect(getDraft(A)).toEqual({ text: '', failed: null });
    expect(getDraft(A)).toBe(getDraft(B));
  });

  it('clear forgets the draft; an empty draft with no failure is not stored', () => {
    setDraft(A, { text: 'x', failed: null });
    clearDraft(A);
    expect(getDraft(A).text).toBe('');
    setDraft(B, { text: '', failed: null });
    expect(getDraft(B)).toBe(getDraft(A));
  });

  it('each phone keeps its own draft; clearAllDrafts forgets them all', () => {
    setDraft(A, { text: 'أ', failed: null });
    setDraft(B, { text: 'ب', failed: null });
    clearDraft(A);
    expect(getDraft(B).text).toBe('ب');
    clearAllDrafts();
    expect(getDraft(B).text).toBe('');
  });

  it('notifies subscribers on every change', () => {
    const listener = vi.fn();
    const off = subscribeDrafts(listener);
    setDraft(A, { text: 'أ', failed: null });
    clearDraft(A);
    off();
    setDraft(A, { text: 'ب', failed: null });
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe('requestIdFor (rule 8)', () => {
  const failed = { text: 'السلام عليكم', failed: { text: 'السلام عليكم', id: 'r-1', code: 'send_failed' } };

  it('the failed text again → the failed attempt’s id', () => {
    expect(requestIdFor(failed, 'السلام عليكم')).toBe('r-1');
  });

  it('edited text → a fresh uuid', () => {
    const id = requestIdFor(failed, 'السلام عليكم ورحمة الله');
    expect(id).not.toBe('r-1');
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('no failure → a fresh uuid each time', () => {
    const none = { text: 'x', failed: null };
    expect(requestIdFor(none, 'x')).not.toBe(requestIdFor(none, 'x'));
  });
});

describe('draft generations (round 2 D)', () => {
  it('a write from before clearAllDrafts is dropped; the current generation writes', () => {
    const before = draftGeneration();
    clearAllDrafts();
    setDraft(A, { text: 'قديم', failed: null }, before);
    expect(getDraft(A).text).toBe('');
    setDraft(A, { text: 'جديد', failed: null }, draftGeneration());
    expect(getDraft(A).text).toBe('جديد');
  });
});
