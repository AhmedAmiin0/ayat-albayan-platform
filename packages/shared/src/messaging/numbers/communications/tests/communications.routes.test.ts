import { describe, expect, it } from 'vitest';
import { communicationsRoutes as routes } from '..';

const CELL = { field: 'waba_id', state: 'different', legacy: '1', module: '2' };
const PARITY = {
  source: 'legacy',
  roles: [{ role: 'chat', number_id: null, number_label: null, fields: [CELL] }],
  differences: [{ role: 'chat', field: 'waba_id', state: 'different' }],
  rules: [{ key: 'lesson_reminder', field: 'timing', legacy: '"2h"', module: '"1h"' }],
};

describe('communicationsRoutes', () => {
  it('keeps the paths of today', () => {
    const lines = Object.values(routes).map((r) => `${r.method} ${r.path}`);
    expect(lines).toEqual([
      'GET /admin/communications/parity',
      'POST /admin/communications/source',
    ]);
  });

  it('carries the permissions and the numbers tag of today', () => {
    expect(routes.parity.permissions).toEqual(['settings.read']);
    expect(routes.source.permissions).toEqual(['numbers.manage']);
    expect([routes.parity.tags, routes.source.tags]).toEqual([['numbers'], ['numbers']]);
  });

  it('reads the parity with and without the rules of older builds', () => {
    expect(routes.parity.response.parse(PARITY)).toEqual(PARITY);
    const older = { ...PARITY, rules: undefined };
    expect(routes.parity.response.parse(older)).toEqual(older);
  });

  it('refuses a parity with an unknown role, field or a same difference', () => {
    const bad = [
      { ...PARITY, roles: [{ ...PARITY.roles[0], role: 'sales' }] },
      { ...PARITY, roles: [{ ...PARITY.roles[0], fields: [{ ...CELL, field: 'token' }] }] },
      { ...PARITY, differences: [{ role: 'chat', field: 'waba_id', state: 'same' }] },
      { ...PARITY, source: 'cloud' },
    ];
    const refused = bad.filter((answer) => !routes.parity.response.safeParse(answer).success);
    expect(refused).toEqual(bad);
  });

  it('switches the source with a known name only and answers it', () => {
    expect(routes.source.body.parse({ source: 'module' })).toEqual({ source: 'module' });
    expect(routes.source.body.safeParse({ source: 'cloud' }).success).toBe(false);
    expect(routes.source.response.parse({ source: 'legacy' })).toEqual({ source: 'legacy' });
  });
});
