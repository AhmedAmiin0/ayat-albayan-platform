import { systemPermissionsOf, type UserRole } from '@ab/catalog';
import { chatListRoutes } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import type { AuthUser } from '@/common/auth/verify-token';
import {
  assertListsUser,
  isListId,
  listInvalidPhone,
  listNotFound,
  seesLists,
} from './chat-lists.guard';

const as = (role: UserRole, permissions = systemPermissionsOf(role)): AuthUser => ({
  id: 'u',
  email: null,
  role,
  permissions,
});
const status = (run: () => unknown) => {
  try {
    run();
    return 'ok';
  } catch (e) {
    return (e as { getStatus?: () => number }).getStatus?.();
  }
};
const params = chatListRoutes.dropThread.params;
const idOf = (id: string) => params.shape.id.safeParse(id).data;
const phoneOf = (phone: string) => params.shape.phone.safeParse(phone).data;

describe('assertListsUser / seesLists', () => {
  it('lets the admin and the system sales role in', () => {
    expect(status(() => assertListsUser(as('admin')))).toBe('ok');
    expect(status(() => assertListsUser(as('sales')))).toBe('ok');
    expect([seesLists(as('admin')), seesLists(as('sales'))]).toEqual([true, true]);
  });

  it('refuses a teacher even with inbox.lists granted, and sales without it', () => {
    const teacher = as('teacher', [...systemPermissionsOf('teacher'), 'inbox.lists']);
    expect(status(() => assertListsUser(teacher))).toBe(403);
    expect(seesLists(teacher)).toBe(false);
    const off = as(
      'sales',
      systemPermissionsOf('sales').filter((p) => p !== 'inbox.lists'),
    );
    expect(status(() => assertListsUser(off))).toBe(403);
    expect(seesLists(off)).toBe(false);
  });

  it('needs inbox.read too', () => {
    const noRead = as(
      'sales',
      systemPermissionsOf('sales').filter((p) => p !== 'inbox.read'),
    );
    expect(status(() => assertListsUser(noRead))).toBe(403);
  });
});

describe('list id and phone params', () => {
  it('a malformed id is 404, a uuid passes', () => {
    expect([idOf('nope'), listNotFound().getStatus()]).toEqual([undefined, 404]);
    expect(idOf('0c000000-0000-4000-8000-000000000001')).toBe(
      '0c000000-0000-4000-8000-000000000001',
    );
    expect([isListId('nope'), isListId('0c000000-0000-4000-8000-000000000001')]).toEqual([
      false,
      true,
    ]);
  });

  it('the phone must be E.164 (400 invalid_phone)', () => {
    expect([phoneOf('+966501234567'), phoneOf('abc')]).toEqual(['+966501234567', undefined]);
    expect(listInvalidPhone()).toMatchObject({
      status: 400,
      response: { code: 'invalid_phone', message: 'invalid_phone' },
    });
  });
});
