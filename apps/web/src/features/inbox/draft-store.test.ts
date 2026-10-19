import { afterEach, describe, expect, it } from 'vitest';
import { clearDraft, getDraft, setDraft } from './draft-store';

const A = '+966501234567';
const B = '+966507654321';

afterEach(() => {
  clearDraft(A);
  clearDraft(B);
});

describe('the reply draft per chat', () => {
  it('set then get returns the same text and request id', () => {
    setDraft(A, { text: 'السلام عليكم', requestId: 'r-1' });
    expect(getDraft(A)).toEqual({ text: 'السلام عليكم', requestId: 'r-1' });
  });

  it('an unknown chat starts empty with a fresh uuid each time (nothing stored)', () => {
    const first = getDraft(A);
    expect(first.text).toBe('');
    expect(first.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(getDraft(A).requestId).not.toBe(first.requestId);
  });

  it('clear forgets the draft', () => {
    setDraft(A, { text: 'x', requestId: 'r-1' });
    clearDraft(A);
    expect(getDraft(A).text).toBe('');
  });

  it('each phone keeps its own draft', () => {
    setDraft(A, { text: 'أ', requestId: 'r-a' });
    setDraft(B, { text: 'ب', requestId: 'r-b' });
    expect(getDraft(A)).toEqual({ text: 'أ', requestId: 'r-a' });
    expect(getDraft(B)).toEqual({ text: 'ب', requestId: 'r-b' });
    clearDraft(A);
    expect(getDraft(B).text).toBe('ب');
  });
});
