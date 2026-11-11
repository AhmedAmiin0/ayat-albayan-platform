import { describe, expect, it } from 'vitest';
import { CLOCK_SLACK_MS, renderCutoff, SEND_GRACE_MS } from './report-pdf.cutoff';

const NOW = new Date('2026-11-11T10:00:00Z');
const at = (iso: string) => new Date(iso).getTime();

describe('renderCutoff (docs/46 D5, B3)', () => {
  it('30 minutes: submits up to now − 30 min − 60 s grace are due', () => {
    expect(renderCutoff(NOW, 30).toISOString()).toBe('2026-11-11T09:29:00.000Z');
  });

  it('the window boundary is not yet due: the grace keeps an in-flight edit out of the render', () => {
    const closedAt = at('2026-11-11T09:30:00Z');
    expect(closedAt).toBeGreaterThan(renderCutoff(NOW, 30).getTime());
    expect(closedAt).toBeLessThanOrEqual(renderCutoff(new Date(NOW.getTime() + SEND_GRACE_MS), 30).getTime());
  });

  it('0 minutes: everything submitted so far is due at once (clock slack, no grace)', () => {
    expect(renderCutoff(NOW, 0).getTime()).toBe(NOW.getTime() + CLOCK_SLACK_MS);
  });

  it('the longest window (1440 min) still sends a day later', () => {
    expect(renderCutoff(NOW, 1440).toISOString()).toBe('2026-11-10T09:59:00.000Z');
  });
});
