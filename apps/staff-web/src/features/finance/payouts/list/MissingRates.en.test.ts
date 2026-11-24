import en from '@ab/shared/i18n/en.json';
import { expect, it, vi } from 'vitest';
import { durationsText } from './MissingRates';

vi.mock('@ab/web-kit/lib/i18n/i18n', async (orig) => ({ ...(await orig<object>()), t: en }));

it('joins the missing durations with «and»', () => {
  expect(durationsText([45, 60])).toBe('45 and 60');
  expect(en.payouts.ratesMissing.replace('{durations}', durationsText([30]))).toMatch(/^The rate for 30-minute lessons/);
});
