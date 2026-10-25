import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import {
  apiErrorText,
  currencySymbol,
  moneyText,
  packageName,
  studentProgress,
  taskText,
  unpaidFlagged,
} from './format';
import { WEEKLY } from './money-fixture';
import { pricingBody, todayIn, INITIAL_PRICING } from './pricing-form';
import { parseMonthSearch, parsePage, parseSubscriptionsSearch, subscriptionsTable } from './search';

describe('money text (docs/07 §6, Western digits)', () => {
  it('currency symbols, EGP for teacher money, ISO otherwise', () => {
    expect(currencySymbol('SAR')).toBe(t.pricing.currencies.SAR);
    expect(currencySymbol('EGP')).toBe(t.payouts.currency);
    expect(currencySymbol('GBP')).toBe('GBP');
    expect(moneyText(1061, 'SAR')).toBe(`1,061 ${t.pricing.currencies.SAR}`);
  });

  it('package names: the size, or the custom count', () => {
    expect(packageName(WEEKLY)).toBe(t.enums.packageSize['4']);
    expect(packageName({ package: null, lessons_total: 10 })).toBe('10 حلقات');
  });

  it('the student line counts every package (FIFO): 1 left + 4 new = 5', () => {
    const old = { ...WEEKLY, balance: { ...WEEKLY.balance, lessons_used: 3, remaining: 1 } };
    const fresh = { ...WEEKLY, id: 'sub-2', balance: { ...WEEKLY.balance, lessons_used: 0, remaining: 4 } };
    expect(studentProgress({ packages: [old, fresh] })).toMatchObject({ remaining: 5, remainingLabel: 'بقيت 5 حلقات' });
    expect(studentProgress({ packages: [WEEKLY] })).toMatchObject({ remainingLabel: 'بقيت حلقتان', tone: 'act' });
  });

  it('task wording: the student and the line kept when it was raised', () => {
    const task = {
      id: 'k1', kind: 'renewal_due' as const, subject_type: 'subscription', subject_id: 'sub-1',
      student: WEEKLY.student, title: 'بقيت حلقتان', due_at: null, done_at: null, created_at: '2026-10-02T09:00:00Z',
    };
    // The stored balance («بقيت حلقتان» when raised) can be stale: never shown.
    expect(taskText(task)).toBe('باقة سهيلة قاربت على الانتهاء');
    expect(taskText({ ...task, title: null })).toBe('باقة سهيلة قاربت على الانتهاء');
    expect(taskText({ ...task, kind: 'subscription_unpaid' })).toBe('انتهت باقة سهيلة وتحتاج إلى تجديد');
  });

  it('unpaid flag: newest package unpaid and nothing left', () => {
    expect(unpaidFlagged(WEEKLY, 0)).toBe(true);
    expect(unpaidFlagged(WEEKLY, 2)).toBe(false);
    expect(unpaidFlagged({ ...WEEKLY, status: 'active' }, -1)).toBe(false);
    expect(unpaidFlagged(null, 0)).toBe(false);
  });
});

describe('apiErrorText', () => {
  it('a domain code, with the package currency filled in', () => {
    const e = new ApiError(400, { code: 'currency_mismatch', message: 'currency_mismatch', currency: 'SAR' });
    expect(apiErrorText(e, t.payments.error)).toBe(t.payments.error.currency_mismatch.replace('{currency}', 'SAR'));
  });

  it('a zod issue message; anything unknown is the generic line', () => {
    const issue = new ApiError(400, { message: 'validation_failed', issues: [{ path: 'paidAt', message: 'paid_at_future' }] });
    expect(apiErrorText(issue, t.payments.error)).toBe(t.payments.error.paid_at_future);
    expect(apiErrorText(new ApiError(500, null), t.payments.error)).toBe(t.common.error);
    expect(apiErrorText(new Error('x'), t.payments.error)).toBe(t.common.error);
    expect(apiErrorText(new ApiError(409, { code: 'nope' }), t.payments.error)).toBe(t.common.error);
  });
});

describe('the create dialog inputs (never a price)', () => {
  it('a tier with the guardian country left to the API', () => {
    expect(pricingBody(INITIAL_PRICING)).toEqual({ tier: 'standard', duration: 45, discount: 0 });
  });

  it('a custom count is clamped to 1–60; discount 0–100; an explicit country', () => {
    expect(pricingBody({ ...INITIAL_PRICING, pkg: 'custom', count: 99, discount: 150, country: 'AE' })).toEqual({
      count: 60, duration: 45, discount: 100, country: 'AE',
    });
    expect(pricingBody({ ...INITIAL_PRICING, pkg: 'custom', count: Number.NaN })).toMatchObject({ count: 1 });
  });

  it('today in a zone (the start day)', () => {
    expect(todayIn('Asia/Riyadh', new Date('2026-10-01T22:30:00Z'))).toBe('2026-10-02');
  });
});

describe('URL search', () => {
  it('page, status and month defaults stay out of the URL', () => {
    expect(parsePage({ page: '3' })).toEqual({ page: 3 });
    expect(parsePage({ page: '1' })).toEqual({ page: undefined });
    expect(parseSubscriptionsSearch({ status: 'unpaid' })).toEqual({ page: undefined, status: 'unpaid' });
    expect(parseSubscriptionsSearch({ status: 'gold' })).toEqual({ page: undefined, status: undefined });
    expect(parseMonthSearch({ month: '2026-09' })).toEqual({ month: '2026-09' });
    expect(parseMonthSearch({ month: '2026-13' })).toEqual({ month: undefined });
  });

  it('subscriptions: allowlisted sort and column filters → the API keys', () => {
    const s = parseSubscriptionsSearch({ sort: 'price', dir: 'desc', f_student: ' سهيلة ', f_package: '8' });
    expect(s).toMatchObject({ sort: 'price', dir: 'desc', f_student: 'سهيلة', f_package: '8' });
    expect(subscriptionsTable(s)).toEqual({ sort: { sort: 'price', dir: 'desc' }, filters: { student: 'سهيلة', package: '8' } });
    const bad = parseSubscriptionsSearch({ sort: 'balance', f_package: 'gold' });
    expect(subscriptionsTable(bad)).toEqual({ sort: {}, filters: {} });
  });
});
