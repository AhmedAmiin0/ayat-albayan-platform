import { describe, expect, it } from 'vitest';
import { ASSISTANT_COMMISSION_STATUSES } from '../assistant/commission.js';
import { commissionStatusStyle, walletStateStyle } from './commission-status-style.js';

describe('commissionStatusStyle', () => {
  it('every commission status is mapped: earned settled, voided struck in the danger tone', () => {
    expect(Object.keys(commissionStatusStyle).sort()).toEqual([...ASSISTANT_COMMISSION_STATUSES].sort());
    expect(commissionStatusStyle.earned).toEqual({ tone: 'ok', glyph: 'fill' });
    expect(commissionStatusStyle.voided).toEqual({ tone: 'bad', glyph: 'struck' });
  });
});

describe('walletStateStyle («محفظتي»)', () => {
  it('every wallet state is mapped; paid is settled, voided struck', () => {
    expect(Object.keys(walletStateStyle).sort()).toEqual(['due', 'in_statement', 'paid', 'voided']);
    expect(walletStateStyle.paid).toEqual({ tone: 'ok', glyph: 'fill' });
    expect(walletStateStyle.voided.glyph).toBe('struck');
  });
});
