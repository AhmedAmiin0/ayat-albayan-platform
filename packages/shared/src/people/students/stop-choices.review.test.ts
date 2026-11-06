import { describe, expect, it } from 'vitest';
import { oweLowersDefault, replayRefund } from './stop-choices.js';

// Review fixes of PR #644: a replay plans from the stored decision; lowering what is owed below
// attended × rate is a refund holder's call. 400 SAR, charge 150.
const owe = { charged: 150, price: 400 };

describe('replayRefund', () => {
  it('net paid − the stored owed amount, never below 0', () => {
    expect(replayRefund(290, 150, 'SAR')).toBe(140);
    expect(replayRefund(290, 0, 'SAR')).toBe(290);
    expect(replayRefund(100, 150, 'SAR')).toBe(0);
    expect(replayRefund(290.1, 150.05, 'SAR')).toBe(140.05);
  });
});

describe('oweLowersDefault', () => {
  it.each([
    [undefined, false],
    [{ choice: 'attended' as const }, false],
    [{ choice: 'price' as const }, false],
    [{ choice: 'nothing' as const }, true],
    [{ choice: 'custom' as const, amount: 149.99 }, true],
    [{ choice: 'custom' as const, amount: 150 }, false],
    [{ choice: 'custom' as const, amount: 400 }, false],
  ])('%o → %s', (ask, lowers) => {
    expect(oweLowersDefault(ask, owe, 'SAR')).toBe(lowers);
  });
});
