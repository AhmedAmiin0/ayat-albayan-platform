import type { AssistantTermsView } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { termsFormOf, termStartMins, termsToInput, type TermsForm } from '../index.js';

const TODAY = '2026-10-06';
const SAVED: AssistantTermsView = {
  assistant_id: 'a1',
  commission: { type: 'percent', value: 10, currency: null, starts_on: '2026-10-01' },
  salary: { amount: 3000, currency: 'EGP', starts_on: '2026-10-01' },
  renewal_share_percent: 50,
};
const blank = (patch: Partial<TermsForm> = {}): TermsForm => ({ ...termsFormOf(null, TODAY), ...patch });

describe('assistant terms form (R-ASST-02, R-ASST-03)', () => {
  it('a new assistant starts empty on the given day, in EGP', () => {
    expect(termsFormOf(null, TODAY)).toEqual({
      salaryAmount: '',
      salaryCurrency: 'EGP',
      salaryStartsOn: TODAY,
      commType: '',
      commValue: '',
      commCurrency: 'EGP',
      commStartsOn: TODAY,
    });
  });

  it('round-trips saved terms; empty parts clear', () => {
    expect(termsToInput(termsFormOf(SAVED, TODAY))).toEqual({
      value: {
        salary: { amount: 3000, currency: 'EGP', startsOn: '2026-10-01' },
        commission: { type: 'percent', value: 10, currency: null, startsOn: '2026-10-01' },
      },
    });
    expect(termsToInput(blank())).toEqual({ value: { salary: null, commission: null } });
  });

  it('a fixed commission keeps its currency; schema issues map to fields', () => {
    const fixed = termsToInput(blank({ commType: 'fixed', commValue: '50', commCurrency: 'SAR' }));
    expect(fixed).toEqual({ value: { salary: null, commission: { type: 'fixed', value: 50, currency: 'SAR', startsOn: TODAY } } });
    expect(termsToInput(blank({ commType: 'percent', commValue: '150' }))).toEqual({ errors: { commValue: 'percent_max_100' } });
    const r = termsToInput(blank({ salaryAmount: 'abc' }));
    expect('errors' in r && r.errors.salaryAmount).toBeTruthy();
  });

  it('start days are never retroactive and a saved day never moves earlier', () => {
    const none = { current: null, today: TODAY };
    const past = blank({ salaryAmount: '100', salaryStartsOn: '2026-10-05', commType: 'percent', commValue: '10', commStartsOn: '2026-10-05' });
    expect(termsToInput(past, none)).toEqual({ errors: { salaryStartsOn: 'salary_start_in_past', commStartsOn: 'commission_start_in_past' } });
    const saved = { current: SAVED, today: TODAY };
    const form = { ...termsFormOf(SAVED, TODAY), salaryStartsOn: '2026-09-30', commStartsOn: '2026-09-30' };
    expect(termsToInput(form, saved)).toEqual({ errors: { salaryStartsOn: 'salary_start_earlier', commStartsOn: 'commission_start_earlier' } });
    expect(termStartMins(none)).toEqual({ salary: TODAY, commission: TODAY });
    expect(termStartMins(saved)).toEqual({ salary: '2026-10-01', commission: '2026-10-01' });
  });
});
