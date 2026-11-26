import { describe, expect, it } from 'vitest';
import { decide, GATE_RULES, outcomeOfRecord, type GateFacts } from './gate.decision';

const ok: GateFacts = { live: true, listed: false, inList: false, full: false, returning: false };

describe('the gate decision table (docs/19)', () => {
  it.each([
    ['revoked or expired → gone, whatever else', { live: false, listed: true, full: true }, 'gone'],
    [
      'listed, visitor not in the list → not_allowed',
      { listed: true, inList: false },
      'not_allowed',
    ],
    ['listed, visitor in the list → open', { listed: true, inList: true }, 'open'],
    [
      'limit reached, NEW visitor → limit_reached',
      { full: true, returning: false },
      'limit_reached',
    ],
    ['limit reached, RETURNING visitor → open', { full: true, returning: true }, 'open'],
    ['anyone, live, room left → open', {}, 'open'],
    ['not in the list beats the limit', { listed: true, full: true }, 'not_allowed'],
  ] as const)('%s', (_name, facts, outcome) => {
    expect(decide({ ...ok, ...facts })).toBe(outcome);
  });

  it('is a lookup of three rows in order: gone, not_allowed, limit_reached', () => {
    expect(GATE_RULES.map(([o]) => o)).toEqual(['gone', 'not_allowed', 'limit_reached']);
  });

  it("maps the database's answer; an unknown answer is gone", () => {
    expect(['constructor', '__proto__'].map(outcomeOfRecord)).toEqual(['gone', 'gone']);
    expect(['recorded', 'limit_reached', 'gone', 'x'].map(outcomeOfRecord)).toEqual([
      'open',
      'limit_reached',
      'gone',
      'gone',
    ]);
  });
});
