import { describe, expect, it } from 'vitest';
import { scheduleRuleRoutes } from '../schedule-rules.routes';

const RULE = '00000000-0000-4000-8000-0000000000a1';
const AT = { startsAt: '2026-10-05T14:00:00.000Z', endsAt: '2026-10-05T14:45:00.000Z' };
const RESULT = {
  rule_id: RULE,
  until: '2026-11-06T10:00:00.000Z',
  inserted: 2,
  conflicts: [{ kind: 'time_off', ...AT }],
};

describe('scheduleRuleRoutes.extend (R-SCH-02)', () => {
  const { extend } = scheduleRuleRoutes;

  it('keeps the path the api serves today', () => {
    expect(`${extend.method} ${extend.path}`).toBe('POST /schedule-rules/:id/extend');
  });

  it('takes the rule id, and weeks 1..12 or no body at all', () => {
    expect(extend.params.parse({ id: RULE })).toEqual({ id: RULE });
    expect(extend.params.safeParse({ id: 'nope' }).success).toBe(false);
    expect(extend.body.parse(undefined)).toEqual({});
    expect(extend.body.parse({ weeks: 8 })).toEqual({ weeks: 8 });
    expect(extend.body.safeParse({ weeks: 13 }).success).toBe(false);
    expect(extend.body.safeParse({ weeks: 0 }).success).toBe(false);
  });

  it('answers the new end and the clashes, and refuses an answer without them', () => {
    expect(extend.response.parse(RESULT)).toEqual(RESULT);
    const { conflicts: _conflicts, ...noConflicts } = RESULT;
    expect(extend.response.safeParse(noConflicts).success).toBe(false);
    expect(extend.response.safeParse({ ...RESULT, inserted: -1 }).success).toBe(false);
  });
});
