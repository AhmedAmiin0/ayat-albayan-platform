import { describe, expect, it } from 'vitest';
import { spansOverlap } from './overlap.js';

const span = (from: string, to: string) => ({
  starts_at: new Date(`2026-11-02T${from}:00Z`),
  ends_at: new Date(`2026-11-02T${to}:00Z`),
});

describe('spansOverlap', () => {
  it('is true when the spans share time, in either order', () => {
    expect(spansOverlap(span('10:00', '11:00'), span('10:30', '11:30'))).toBe(true);
    expect(spansOverlap(span('10:30', '11:30'), span('10:00', '11:00'))).toBe(true);
  });

  it('is true when one span holds the other', () => {
    expect(spansOverlap(span('10:00', '12:00'), span('10:30', '11:00'))).toBe(true);
  });

  it('is false when one ends exactly as the other starts', () => {
    expect(spansOverlap(span('10:00', '11:00'), span('11:00', '12:00'))).toBe(false);
    expect(spansOverlap(span('11:00', '12:00'), span('10:00', '11:00'))).toBe(false);
  });

  it('is false for spans apart', () => {
    expect(spansOverlap(span('08:00', '09:00'), span('10:00', '11:00'))).toBe(false);
  });
});
