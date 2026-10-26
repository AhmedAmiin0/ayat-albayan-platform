import { describe, expect, it } from 'vitest';
import * as runtime from '../index.js';
import { assistantTermsSchema } from '../assistant/schemas.js';
import { reportDraftSchema } from '../reports/schema.js';
import { ASSISTANT, BALANCE, commission, FULL_GRADES, PAYMENT, reportView, statement, termsRowOf } from './index.js';

describe('shared test fixtures', () => {
  it('stay out of the runtime @ab/shared entry', () => {
    for (const name of ['ASSISTANT', 'BALANCE', 'PAYMENT', 'FULL_GRADES', 'reportView', 'termsRowOf']) {
      expect(name in runtime).toBe(false);
    }
  });

  it('assistant terms parse with the terms command schema', () => {
    const { commission: c, salary: s } = ASSISTANT.terms;
    const parsed = assistantTermsSchema.safeParse({
      commission: c && { type: c.type, value: c.value, currency: c.currency, startsOn: c.starts_on },
      salary: s && { amount: s.amount, currency: s.currency, startsOn: s.starts_on },
    });
    expect(parsed.success).toBe(true);
    expect(termsRowOf(ASSISTANT)).toEqual({ ...ASSISTANT.terms, name: 'الزهراء' });
  });

  it('commission and statement builders take overrides and keep currencies apart', () => {
    expect(commission({ status: 'voided' })).toMatchObject({ id: 'c1', amount: 50, status: 'voided' });
    const st = statement();
    for (const [cur, t] of Object.entries(st.totals)) {
      const sum = st.lines.filter((l) => l.currency === cur).reduce((acc, l) => acc + l.amount, 0);
      expect(t.total).toBe(sum);
    }
  });

  it('earnings rows agree with each other', () => {
    expect(BALANCE.earned - BALANCE.paid).toBe(BALANCE.outstanding);
    expect(PAYMENT).toMatchObject({ teacher_id: BALANCE.teacher.id, amount: BALANCE.paid, currency: BALANCE.currency });
  });

  it('report grades parse with the draft schema and the view builder takes overrides', () => {
    expect(reportDraftSchema.safeParse({ grades: FULL_GRADES }).success).toBe(true);
    expect(reportView().grades).toEqual({
      recitation: null,
      memorization: null,
      revision: null,
      tajweed: null,
      engagement: null,
      commitment: null,
    });
    expect(reportView({ status: 'submitted', version: 1 })).toMatchObject({ id: 'r-1', status: 'submitted', version: 1 });
  });
});
