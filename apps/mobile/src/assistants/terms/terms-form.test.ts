import { ASSISTANT } from '../api/fixtures';
import { formOf, shiftDay, startMins, TERM_CURRENCIES, todayDay, toInput, type TermsForm } from './terms-form';

const TODAY = '2026-10-06';
const blank = (patch: Partial<TermsForm> = {}): TermsForm => ({ ...formOf(null, TODAY), ...patch });

describe('terms form (the web terms-form.ts, R-ASST-02/03)', () => {
  it('a new salesperson starts empty: EGP, today, no commission', () => {
    expect(formOf(null, TODAY)).toEqual({
      salaryAmount: '',
      salaryCurrency: 'EGP',
      salaryStartsOn: TODAY,
      commType: '',
      commValue: '',
      commCurrency: 'EGP',
      commStartsOn: TODAY,
    });
  });

  it('round-trips the saved terms into the PUT body', () => {
    expect(toInput(formOf(ASSISTANT.terms, TODAY))).toEqual({
      value: {
        salary: { amount: 3000, currency: 'EGP', startsOn: '2026-10-01' },
        commission: { type: 'percent', value: 10, currency: null, startsOn: '2026-10-01' },
      },
    });
  });

  it('an empty salary and no commission type clear both parts', () => {
    expect(toInput(blank())).toEqual({ value: { salary: null, commission: null } });
  });

  it('a fixed commission keeps its own currency; a percent sends none', () => {
    const fixed = toInput(blank({ commType: 'fixed', commValue: '50', commCurrency: 'SAR' }));
    expect(fixed).toEqual({ value: { salary: null, commission: { type: 'fixed', value: 50, currency: 'SAR', startsOn: TODAY } } });
    const percent = toInput(blank({ commType: 'percent', commValue: '12.5', commCurrency: 'SAR' }));
    expect(percent).toEqual({ value: { salary: null, commission: { type: 'percent', value: 12.5, currency: null, startsOn: TODAY } } });
  });

  it('a percent over 100, a zero or empty value and a third decimal are field errors', () => {
    expect(toInput(blank({ commType: 'percent', commValue: '150' }))).toEqual({ errors: { commValue: 'percent_max_100' } });
    expect('errors' in toInput(blank({ commType: 'fixed', commValue: '' }))).toBe(true);
    expect('errors' in toInput(blank({ commType: 'fixed', commValue: '0' }))).toBe(true);
    expect(toInput(blank({ commType: 'fixed', commValue: '1.234' }))).toEqual({ errors: { commValue: 'too_many_decimals' } });
  });

  it('a salary needs a positive amount', () => {
    const r = toInput(blank({ salaryAmount: 'abc' }));
    expect('errors' in r && r.errors.salaryAmount).toBeTruthy();
    expect('errors' in toInput(blank({ salaryAmount: '-5' }))).toBe(true);
  });
});

describe('start days: nothing is retroactive (twin of set_assistant_terms)', () => {
  const none = { current: null, today: TODAY };
  const saved = { current: ASSISTANT.terms, today: TODAY };

  it('a new part cannot start in the past; today or later is fine', () => {
    const past = blank({ salaryAmount: '100', salaryStartsOn: '2026-10-05', commType: 'percent', commValue: '10', commStartsOn: '2026-10-05' });
    expect(toInput(past, none)).toEqual({ errors: { salaryStartsOn: 'salary_start_in_past', commStartsOn: 'commission_start_in_past' } });
    const ok = blank({ salaryAmount: '100', salaryStartsOn: TODAY, commType: 'percent', commValue: '10', commStartsOn: '2026-11-01' });
    expect('value' in toInput(ok, none)).toBe(true);
  });

  it('a saved day can stay or move later, never earlier', () => {
    const form = (day: string) => ({ ...formOf(ASSISTANT.terms, TODAY), salaryStartsOn: day, commStartsOn: day });
    expect('value' in toInput(form('2026-10-01'), saved)).toBe(true);
    expect('value' in toInput(form('2026-12-01'), saved)).toBe(true);
    expect(toInput(form('2026-09-30'), saved)).toEqual({ errors: { salaryStartsOn: 'salary_start_earlier', commStartsOn: 'commission_start_earlier' } });
  });

  it('the earliest day of each part: today for a new one, the saved day otherwise', () => {
    expect(startMins(none)).toEqual({ salary: TODAY, commission: TODAY });
    expect(startMins(saved)).toEqual({ salary: '2026-10-01', commission: '2026-10-01' });
  });
});

describe('the day stepper and the currencies', () => {
  it.each([
    ['2026-10-31', { days: 1 }, '2026-11-01'],
    ['2026-01-01', { days: -1 }, '2025-12-31'],
    ['2026-01-31', { months: 1 }, '2026-02-28'],
    ['2026-03-15', { months: -1 }, '2026-02-15'],
    ['2026-12-10', { months: 1 }, '2027-01-10'],
  ])('%s %j → %s', (day, step, expected) => {
    expect(shiftDay(day, step)).toBe(expected);
  });

  it('today is the Riyadh day; EGP is offered first, once', () => {
    expect(todayDay(new Date('2026-10-05T22:30:00Z'))).toBe('2026-10-06');
    expect(TERM_CURRENCIES[0]).toBe('EGP');
    expect(new Set(TERM_CURRENCIES).size).toBe(TERM_CURRENCIES.length);
  });
});
