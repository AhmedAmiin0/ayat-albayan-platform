import { defaultGrantsOf, isGrantable } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { UNSEEDED } from './roles.fakes';

describe('keys granted without a migration (owner 2026-11-02)', () => {
  it('are grantable and a default of no system role but the admin', () => {
    for (const k of UNSEEDED) {
      expect(isGrantable(k)).toBe(true);
      for (const role of ['teacher', 'assistant', 'sales'] as const) {
        expect(defaultGrantsOf(role)).not.toContain(k);
      }
    }
  });
});
