import { HttpException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import type { AuthUser } from '../../common/auth/verify-token';
import { fakeDb } from '../guardians/fake-db';
import { salesPeople } from '../inbox/sales-threads';
import { assertSalesPhone, SalesScopes } from './sales-scope';
import { SalesQueries } from './sales.queries';

const BROUGHT_PHONE = '+966553330000';
const user = (id: string): AuthUser => ({ id, email: null, role: 'sales' });
const code = (fn: () => void): string | null => {
  try {
    fn();
    return null;
  } catch (e) {
    return e instanceof HttpException ? (e.getResponse() as { code: string }).code : 'other';
  }
};

/** The real scope chain (SalesScopes -> SalesQueries -> ownershipOf) over a fake database: A brought s9 (guardian g9). */
const scopes = (rows: { brought: object[]; guardians: object[] }) => {
  const { db } = fakeDb({ leads: [{ data: [] }], students: [{ data: rows.brought }], guardians: [{ data: rows.guardians }] });
  return new SalesScopes(new SalesQueries(db));
};

describe('the inbox scope of an assistant covers the families of the students she brought', () => {
  it('A: the brought guardian phone is in her thread scope, and only her brought child is listed', async () => {
    const scope = await scopes({ brought: [{ id: 's9', guardian_id: 'g9' }], guardians: [{ phone_e164: BROUGHT_PHONE }] }).of(user('a'));
    if (!scope) throw new Error('a salesperson has a scope');
    expect(code(() => assertSalesPhone(scope, BROUGHT_PHONE))).toBeNull();
    expect(code(() => assertSalesPhone(scope, '+966559999999'))).toBe('not_your_thread');
    const people = { guardian: { id: 'g9', name: 'x' }, lead: null, students: [{ id: 's9' }, { id: 'sibling' }] };
    expect(salesPeople(people as never, scope).students.map((s) => s.id)).toEqual(['s9']);
  });

  it('B brought nobody: the same phone is 403 not_your_thread', async () => {
    const scope = await scopes({ brought: [], guardians: [] }).of(user('b'));
    if (!scope) throw new Error('a salesperson has a scope');
    expect(code(() => assertSalesPhone(scope, BROUGHT_PHONE))).toBe('not_your_thread');
    expect(scope.studentIds.size).toBe(0);
  });
});
