import { describe, expect, it } from 'vitest';
import { ASSISTANT } from '@/features/people/assistants/fixtures';
import { formOf, startMins, toInput, type TermsForm } from './terms-form';

const TODAY = '2026-10-06';
const blank = (patch: Partial<TermsForm> = {}): TermsForm => ({ ...formOf(null, TODAY), ...patch });

describe('terms form (R-ASST-02, R-ASST-03)', () => {
  it('a new assistant starts empty: EGP, today, no commission', () => {
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
  const saved = { current: ASSISTANT.terms, today: TODAY }; // both parts start 2026-10-01

  it('a new part cannot start in the past; today or later is fine', () => {
    const past = blank({ salaryAmount: '100', salaryStartsOn: '2026-10-05', commType: 'percent', commValue: '10', commStartsOn: '2026-10-05' });
    expect(toInput(past, none)).toEqual({ errors: { salaryStartsOn: 'salary_start_in_past', commStartsOn: 'commission_start_in_past' } });
    const ok = blank({ salaryAmount: '100', salaryStartsOn: TODAY, commType: 'percent', commValue: '10', commStartsOn: '2026-11-01' });
    expect('value' in toInput(ok, none)).toBe(true);
  });

  it('a saved day can stay or move later, never earlier', () => {
    const form = (day: string) => ({ ...formOf(ASSISTANT.terms, TODAY), salaryStartsOn: day, commStartsOn: day });
    expect('value' in toInput(form('2026-10-01'), saved)).toBe(true); // unchanged although already in the past
    expect('value' in toInput(form('2026-12-01'), saved)).toBe(true);
    expect(toInput(form('2026-09-30'), saved)).toEqual({ errors: { salaryStartsOn: 'salary_start_earlier', commStartsOn: 'commission_start_earlier' } });
  });

  it('a cleared part, a half-typed date and a form without rules are not checked; the min of each field', () => {
    expect('value' in toInput(blank({ salaryStartsOn: '2020-01-01' }), none)).toBe(true); // no salary amount: cleared
    expect(toInput(blank({ salaryAmount: '100', salaryStartsOn: '2026-1' }), none)).toMatchObject({ errors: { salaryStartsOn: expect.any(String) } });
    expect('value' in toInput(blank({ salaryAmount: '100', salaryStartsOn: '2020-01-01' }))).toBe(true);
    expect(startMins(none)).toEqual({ salary: TODAY, commission: TODAY });
    expect(startMins(saved)).toEqual({ salary: '2026-10-01', commission: '2026-10-01' });
  });
});
