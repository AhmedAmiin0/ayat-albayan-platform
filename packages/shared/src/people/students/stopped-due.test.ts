import { describe, expect, it } from 'vitest';
import { stoppedCharge } from './stopped-due.js';

const pkg = { price: 1000, currency: 'SAR', lessonsTotal: 10, attended: 3 };

describe('stoppedCharge (what a stopped course is still owed for)', () => {
  it('the attended lessons at the rate, never the price', () => {
    expect(stoppedCharge(pkg, 100)).toBe(300);
    expect(stoppedCharge(pkg, 50)).toBe(150);
  });

  it('nothing attended: nothing owed', () => {
    expect(stoppedCharge({ ...pkg, attended: 0 }, 100)).toBe(0);
  });

  it('never above the package (attended capped at its lessons)', () => {
    expect(stoppedCharge({ ...pkg, attended: 12 }, 100)).toBe(1000);
  });

  it('a rate above 100 % never owes more than the price', () => {
    expect(stoppedCharge({ ...pkg, attended: 8 }, 150)).toBe(1000);
    expect(stoppedCharge({ ...pkg, attended: 10 }, 300)).toBe(1000);
    expect(stoppedCharge(pkg, 150)).toBe(450);
  });
});
