import { describe, expect, it } from 'vitest';
import { commissionStatusStyle } from './status';

describe('commissionStatusStyle', () => {
  it('earned is settled money; voided is struck in the danger tone', () => {
    expect(commissionStatusStyle).toEqual({ earned: { tone: 'ok', glyph: 'fill' }, voided: { tone: 'bad', glyph: 'struck' } });
  });
});
