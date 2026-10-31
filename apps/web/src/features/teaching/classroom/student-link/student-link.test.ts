import { describe, expect, it } from 'vitest';
import { isLessonNow, windowStateAt } from './student-link';

const w = { opens_at: '2026-10-05T15:45:00.000Z', closes_at: '2026-10-05T19:00:00.000Z' };
const at = (iso: string) => new Date(iso);

describe('windowStateAt', () => {
  it('is early, open (edges included) and closed by the page clock', () => {
    expect(windowStateAt(w, at('2026-10-05T15:44:59Z'))).toBe('early');
    expect(windowStateAt(w, at('2026-10-05T15:45:00Z'))).toBe('open');
    expect(windowStateAt(w, at('2026-10-05T19:00:00Z'))).toBe('open');
    expect(windowStateAt(w, at('2026-10-05T19:00:01Z'))).toBe('closed');
  });
});

describe('isLessonNow', () => {
  const l = { starts_at: '2026-10-05T16:00:00.000Z', ends_at: '2026-10-05T17:00:00.000Z' };
  it('is true from the start until the end', () => {
    expect(isLessonNow(l, at('2026-10-05T15:59:59Z'))).toBe(false);
    expect(isLessonNow(l, at('2026-10-05T16:00:00Z'))).toBe(true);
    expect(isLessonNow(l, at('2026-10-05T17:00:00Z'))).toBe(false);
  });
});

