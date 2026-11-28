import { describe, expect, it } from 'vitest';
import { configParityRoutes as routes } from '@/common/configuration/config-store/parity';

describe('configParityRoutes', () => {
  it('keeps the path, the read permission and the config tag of today', () => {
    const { method, path, permissions, tags } = routes.parity;
    expect({ method, path, permissions, tags }).toEqual({
      method: 'GET',
      path: '/admin/config/parity',
      permissions: ['settings.read'],
      tags: ['config'],
    });
  });

  it('answers the diffs with any value on either side', () => {
    const diffs = [{ key: 'rule:comms_source', legacy: null, store: 'x' }];
    const view = { diffs, checkedKeys: 3 };
    expect(routes.parity.response.parse(view)).toEqual(view);
  });

  it('refuses a negative or fractional key count, and a diff without its key', () => {
    const bad = [
      { diffs: [], checkedKeys: -1 },
      { diffs: [], checkedKeys: 1.5 },
      { diffs: [{ legacy: 1, store: 2 }], checkedKeys: 1 },
    ];
    for (const view of bad) expect(routes.parity.response.safeParse(view).success).toBe(false);
  });
});
