import { describe, expect, it } from 'vitest';
import type { AuthUser } from '../../../common/auth/verify-token';
import { SalesScopes } from './sales-scope';

const user = (role: AuthUser['role']): AuthUser => ({ id: 'p1', email: null, role });

describe('SalesScopes.of', () => {
  it('a salesperson: every chat, named by her profile id (no phone list, nothing read)', async () => {
    expect(await new SalesScopes().of(user('sales'))).toEqual({ salesId: 'p1' });
  });

  it('every other role: null (admin and teacher keep their own paths)', async () => {
    for (const role of ['admin', 'teacher', 'assistant', 'guardian', 'student', null] as const) {
      expect(await new SalesScopes().of(user(role))).toBeNull();
    }
  });
});
