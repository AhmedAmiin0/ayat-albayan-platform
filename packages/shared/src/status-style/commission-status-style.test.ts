import { describe, expect, it } from 'vitest';
import { ASSISTANT_COMMISSION_STATUSES } from '../assistant/commission.js';
import { commissionStatusStyle } from './commission-status-style.js';

describe('commissionStatusStyle', () => {
  it('every commission status is mapped: earned settled, voided struck in the danger tone', () => {
    expect(Object.keys(commissionStatusStyle).sort()).toEqual([...ASSISTANT_COMMISSION_STATUSES].sort());
    expect(commissionStatusStyle.earned).toEqual({ tone: 'ok', glyph: 'fill' });
    expect(commissionStatusStyle.voided).toEqual({ tone: 'bad', glyph: 'struck' });
  });
});
