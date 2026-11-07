import { describe, expect, it } from 'vitest';
import { correctionBody, correctionsOf, stripCorrectionPrefix } from './correction.js';

// Review of PR #694: one prefix only, and only a correction that reached the family marks its
// original.
const P = 'تصحيح: ';

describe('one prefix only (a correction of a correction, or a typed prefix)', () => {
  it('strips the leading prefix(es) before prefixing', () => {
    expect(correctionBody(P, 'تصحيح: الساعة الخامسة')).toBe('تصحيح: الساعة الخامسة');
    expect(correctionBody(P, '  تصحيح:تصحيح:  الساعة الخامسة')).toBe('تصحيح: الساعة الخامسة');
  });

  it('keeps the prefix inside the text, and an empty prefix strips nothing', () => {
    expect(stripCorrectionPrefix(P, 'الساعة تصحيح: الخامسة')).toBe('الساعة تصحيح: الخامسة');
    expect(stripCorrectionPrefix('', ' نص ')).toBe('نص');
  });
});

describe('correctionsOf: only a correction that reached the family', () => {
  const at = (h: number) => `2026-11-07T0${h}:00:00Z`;
  it.each([
    ['failed', { status: 'failed' }],
    ['hidden', { hidden: { by: 'u1' } }],
    ['deleted', { deleted: true }],
  ])('skips a %s correction', (_, over) => {
    const rows = [
      { id: 'o1', created_at: at(7), corrects_id: null },
      { id: 'c1', created_at: at(8), corrects_id: 'o1', status: 'sent' },
      { id: 'c2', created_at: at(9), corrects_id: 'o1', ...over },
      { id: 'c3', created_at: at(9), corrects_id: 'o2', ...over },
    ];
    expect([...correctionsOf(rows)]).toEqual([['o1', 'c1']]);
  });
});
