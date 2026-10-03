import { HttpException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../../common/auth/verify-token';
import { assertSalesPhone, SalesScopes } from './sales-scope';
import type { SalesQueries } from './sales.queries';
import { OWN_A } from './sales.fakes';

const user = (role: AuthUser['role']): AuthUser => ({ id: 'p1', email: null, role });
const setup = () => {
  const queries = { ownership: vi.fn(async () => OWN_A) };
  return { queries, scopes: new SalesScopes(queries as unknown as SalesQueries) };
};

describe('SalesScopes.of', () => {
  it('a salesperson: the phones of their leads and converted families, read once', async () => {
    const { queries, scopes } = setup();
    const scope = await scopes.of(user('sales'));
    expect(scope).toEqual({ salesId: 'p1', phones: new Set(OWN_A.phones), studentIds: new Set(['s1']) });
    expect(queries.ownership).toHaveBeenCalledWith('p1');
  });

  it('every other role: null and nothing read (admin and teacher keep their own paths)', async () => {
    const { queries, scopes } = setup();
    for (const role of ['admin', 'teacher', 'guardian', null] as const) expect(await scopes.of(user(role))).toBeNull();
    expect(queries.ownership).not.toHaveBeenCalled();
  });
});

describe('assertSalesPhone', () => {
  it('403 not_your_thread outside the scope', () => {
    const scope = { salesId: 'p1', phones: new Set(OWN_A.phones), studentIds: new Set<string>() };
    expect(() => assertSalesPhone(scope, OWN_A.phones[0] ?? '')).not.toThrow();
    try {
      assertSalesPhone(scope, '+966559999999');
      expect.unreachable();
    } catch (e) {
      expect(e instanceof HttpException && [e.getStatus(), (e.getResponse() as { code: string }).code]).toEqual([403, 'not_your_thread']);
    }
  });
});
