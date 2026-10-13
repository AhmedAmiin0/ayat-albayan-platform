import { describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../../common/auth/verify-token';
import type { SalesRegistrationQueries } from './sales-registration.queries';
import { REGISTRATION_CHECKS_PER_WINDOW, SalesRegistrationService } from './sales-registration.service';

const A: AuthUser = { id: 'a', email: null, role: 'sales' };
const B: AuthUser = { id: 'b', email: null, role: 'sales' };
const make = () => {
  const queries = { byPhone: vi.fn(async () => []), byName: vi.fn(async () => []) };
  return { queries, svc: new SalesRegistrationService(queries as unknown as SalesRegistrationQueries) };
};

describe('SalesRegistrationService', () => {
  it('routes a phone and a name to their query', async () => {
    const { queries, svc } = make();
    expect(await svc.check(A, { by: 'phone', phone: '+966551110000' })).toEqual({ found: false, matches: [], more: false });
    await svc.check(A, { by: 'name', q: 'ياسمين' });
    expect(queries.byPhone).toHaveBeenCalledWith('+966551110000');
    expect(queries.byName).toHaveBeenCalledWith('ياسمين');
  });

  it('429 too_many_requests past the per-user budget, per user, and free again after the window', async () => {
    const { queries, svc } = make();
    const q = { by: 'name' as const, q: 'ياسمين' };
    for (let i = 0; i < REGISTRATION_CHECKS_PER_WINDOW; i++) await svc.check(A, q, 1000);
    await expect(svc.check(A, q, 1000)).rejects.toMatchObject({ status: 429, response: { code: 'too_many_requests' } });
    expect(queries.byName).toHaveBeenCalledTimes(REGISTRATION_CHECKS_PER_WINDOW);
    await expect(svc.check(B, q, 1000)).resolves.toMatchObject({ found: false });
    await expect(svc.check(A, q, 1000 + 10 * 60_000)).resolves.toMatchObject({ found: false });
  });
});
