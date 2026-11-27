import { describe, expect, it } from 'vitest';
import { scheduleRuleRoutes } from '../schedule-rules.routes';

const SUMMARY = { rules: 3, inserted: 5, failed: 0, ended: 1 };

describe('scheduleRuleRoutes (R-SCH-02)', () => {
  it('keeps the path the api serves today', () => {
    const { refresh } = scheduleRuleRoutes;
    expect(`${refresh.method} ${refresh.path}`).toBe('POST /schedule-rules/refresh');
  });

  it('answers the counts of the horizon pass', () => {
    expect(scheduleRuleRoutes.refresh.response.parse(SUMMARY)).toEqual(SUMMARY);
  });

  it('refuses an answer without a count, or with a negative or fractional one', () => {
    const { response } = scheduleRuleRoutes.refresh;
    const { ended: _ended, ...noEnded } = SUMMARY;
    expect(response.safeParse(noEnded).success).toBe(false);
    expect(response.safeParse({ ...SUMMARY, inserted: -1 }).success).toBe(false);
    expect(response.safeParse({ ...SUMMARY, rules: 1.5 }).success).toBe(false);
  });
});
