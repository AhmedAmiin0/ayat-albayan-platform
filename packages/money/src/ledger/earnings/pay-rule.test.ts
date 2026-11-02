import { describe, expect, it } from 'vitest';
import { lessonCountsForPay, teacherRateFor, type PayRuleSettings } from './pay-rule.js';

const OFF: PayRuleSettings = { countLate: false, countNoShow: false, countTrials: false };
const RATES = { 30: 50, 45: 70, 60: 90, 90: null };

describe('lessonCountsForPay (public.lesson_counts_for_pay)', () => {
  it('counts a completed lesson; late / no_show only by setting', () => {
    expect(lessonCountsForPay({ status: 'completed', isTrial: false }, OFF)).toBe(true);
    expect(lessonCountsForPay({ status: 'late', isTrial: false }, OFF)).toBe(false);
    expect(lessonCountsForPay({ status: 'late', isTrial: false }, { ...OFF, countLate: true })).toBe(true);
    expect(lessonCountsForPay({ status: 'no_show', isTrial: false }, OFF)).toBe(false);
    expect(lessonCountsForPay({ status: 'no_show', isTrial: false }, { ...OFF, countNoShow: true })).toBe(true);
  });

  it('never counts open, cancelled or excused lessons', () => {
    const all = { countLate: true, countNoShow: true, countTrials: true };
    for (const status of ['scheduled', 'confirmed', 'cancelled_by_admin', 'excused'])
      expect(lessonCountsForPay({ status, isTrial: false }, all)).toBe(false);
  });

  it('a trial counts only with payout_count_trials (default off = the old ledger)', () => {
    expect(lessonCountsForPay({ status: 'completed', isTrial: true }, OFF)).toBe(false);
    expect(lessonCountsForPay({ status: 'completed', isTrial: true }, { ...OFF, countTrials: true })).toBe(true);
  });
});

describe('teacherRateFor (public.teacher_rate_for)', () => {
  it('uses the rate of a standard length, null when the teacher has none for it', () => {
    expect(teacherRateFor(45, RATES)).toBe(70);
    expect(teacherRateFor(90, RATES)).toBeNull();
  });

  it('pro-rates another length from the nearest length with a rate', () => {
    expect(teacherRateFor(50, RATES)).toBe(77.78); // 70 / 45 × 50
    expect(teacherRateFor(40, RATES)).toBe(62.22); // nearest 45
    expect(teacherRateFor(120, RATES)).toBe(180); // 90 has no rate → 60
    expect(teacherRateFor(20, RATES)).toBe(33.33);
  });

  it('a tie goes to the longer length', () => {
    expect(teacherRateFor(75, { 30: null, 45: null, 60: 90, 90: 120 })).toBe(100); // 120 / 90 × 75
  });

  it('null without any rate or for a non-positive length', () => {
    expect(teacherRateFor(50, { 30: null, 45: null, 60: null, 90: null })).toBeNull();
    expect(teacherRateFor(0, RATES)).toBeNull();
  });
});
