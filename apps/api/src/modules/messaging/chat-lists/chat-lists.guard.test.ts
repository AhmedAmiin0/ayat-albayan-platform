import { systemPermissionsOf, type UserRole } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import type { AuthUser } from '@/common/auth/verify-token';
import { paramPipeOf } from '@/common/http/zod-inputs.test-util';
import { ChatListsController } from './chat-lists.controller';
import { assertListsUser, isListId, seesLists } from './chat-lists.guard';

const as = (role: UserRole, permissions = systemPermissionsOf(role)): AuthUser => ({ id: 'u', email: null, role, permissions });
const status = (run: () => unknown) => {
  try {
    run();
    return 'ok';
  } catch (e) {
    return (e as { getStatus?: () => number }).getStatus?.();
  }
};
const idPipe = paramPipeOf(ChatListsController, { method: 'drop', name: 'id' });
const phonePipe = paramPipeOf(ChatListsController, { method: 'drop', name: 'phone' });

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
    const off = as('sales', systemPermissionsOf('sales').filter((p) => p !== 'inbox.lists'));
    expect(status(() => assertListsUser(off))).toBe(403);
    expect(seesLists(off)).toBe(false);
  });

  it('needs inbox.read too', () => {
    const noRead = as('sales', systemPermissionsOf('sales').filter((p) => p !== 'inbox.read'));
    expect(status(() => assertListsUser(noRead))).toBe(403);
  });
});

describe('list id and phone params', () => {
  it('a malformed id is 404, a uuid passes', async () => {
    await expect(idPipe('nope')).rejects.toMatchObject({ status: 404 });
    expect(await idPipe('0c000000-0000-4000-8000-000000000001')).toBe('0c000000-0000-4000-8000-000000000001');
    expect([isListId('nope'), isListId('0c000000-0000-4000-8000-000000000001')]).toEqual([false, true]);
  });

  it('the phone must be E.164 (400 invalid_phone)', async () => {
    expect(await phonePipe('+966501234567')).toBe('+966501234567');
    await expect(phonePipe('abc')).rejects.toMatchObject({
      status: 400,
      response: { code: 'invalid_phone', message: 'invalid_phone' },
    });
  });
});
