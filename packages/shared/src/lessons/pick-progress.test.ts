import { describe, expect, it } from 'vitest';
import ar from '../../i18n/ar.json' with { type: 'json' };
import { pickProgress } from './pick-progress.js';

const t = ar.booking;

describe('pickProgress', () => {
  it('counts the days still to pick', () => {
    expect(pickProgress(t, 1, 2)).toBe('اخترت 1 من 2 — بقي يوم واحد');
    expect(pickProgress(t, 0, 2)).toBe('اخترت 0 من 2 — بقي يومان');
    expect(pickProgress(t, 1, 6)).toBe('اخترت 1 من 6 — بقيت 5 أيام');
  });

  it('asks to remove the extra days', () => {
    expect(pickProgress(t, 3, 2)).toBe('اخترت 3 أيام، احذف يومًا واحدًا');
    expect(pickProgress(t, 4, 2)).toBe('اخترت 4 أيام، احذف يومين');
  });

  it('is null once the count is reached', () => {
    expect(pickProgress(t, 2, 2)).toBeNull();
  });
});
