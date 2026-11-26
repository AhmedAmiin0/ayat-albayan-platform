import { afterEach, describe, expect, it, vi } from 'vitest';
import { emptyDraft } from '@/features/teaching/booking/draft/draft';
import { forgetAllKept, readKept, saveKept } from '@/features/teaching/booking/kept/kept-store';

const KEY = 'student:s-1';
const kept = () => ({
  draft: { ...emptyDraft(), meetingLink: 'https://meet.example/x' },
  step: 'slot' as const,
});

afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
  forgetAllKept();
});

describe('kept admin booking drafts (R-SCH-06)', () => {
  it('reads back what was saved for the same entry only', () => {
    const saved = kept();
    saveKept(KEY, saved);
    expect(readKept(KEY)).toEqual(saved);
    expect(readKept('student:s-2')).toBeUndefined();
  });

  it('keeps the draft in sessionStorage, so a reload of the tab finds it', () => {
    saveKept(KEY, kept());
    expect(sessionStorage.getItem(`ab.booking-draft:${KEY}`)).toContain('meet.example');
  });

  it('forgets the draft when saved as null (a finished or untouched booking)', () => {
    saveKept(KEY, kept());
    saveKept(KEY, null);
    expect(readKept(KEY)).toBeUndefined();
    expect(sessionStorage.length).toBe(0);
  });

  it('drops a stored value that is not a draft', () => {
    sessionStorage.setItem(`ab.booking-draft:${KEY}`, '{"draft":{"kind":"party"},"step":"slot"}');
    expect(readKept(KEY)).toBeUndefined();
    sessionStorage.setItem(`ab.booking-draft:${KEY}`, 'not json');
    expect(readKept(KEY)).toBeUndefined();
  });

  it('carries on in memory when storage throws (private window, blocked site data)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    const saved = kept();
    saveKept(KEY, saved);
    expect(readKept(KEY)).toEqual(saved);
  });

  it('forgets every kept booking when the session ends, and nothing else', () => {
    sessionStorage.setItem('ab.channel-draft:x', 'hello');
    saveKept(KEY, kept());
    saveKept('lead:l-1', kept());
    forgetAllKept();
    expect(readKept(KEY)).toBeUndefined();
    expect(readKept('lead:l-1')).toBeUndefined();
    expect(sessionStorage.getItem('ab.channel-draft:x')).toBe('hello');
  });
});
