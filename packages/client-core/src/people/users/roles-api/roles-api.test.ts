import type { RoleCreate } from '@ab/catalog';
import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../core/http';
import { roleCalls } from './roles-api';

const ID = '6f1c2b8e-0d0a-4c8e-9a51-2a6b0f6d9e11';
const role = {
  id: ID,
  key: 'custom-0a1b2c3d',
  name_ar: 'مشرف',
  name_en: null,
  base_role: 'assistant',
  is_system: false,
  permissions: ['students.read'],
  users: 1,
};
const staffUser = { id: ID, full_name: 'سارة', role: 'assistant', role_id: ID };
const create: RoleCreate = { name_ar: 'مشرف', base_role: 'assistant', permissions: [] };

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('role calls', () => {
  it('reads GET /roles and GET /roles/staff-users', async () => {
    const roles = clientAnswering([role]);
    await expect(roleCalls(roles.client).list()).resolves.toEqual([role]);
    expect(roles.apiFetch).toHaveBeenCalledWith('/roles');
    const users = clientAnswering([staffUser]);
    await expect(roleCalls(users.client).staffUsers()).resolves.toEqual([staffUser]);
    expect(users.apiFetch).toHaveBeenCalledWith('/roles/staff-users');
  });

  it('sends POST /roles, PATCH /roles/:id and POST /roles/:id/reset', async () => {
    const { client, apiSend } = clientAnswering(role);
    const calls = roleCalls(client);
    await calls.create(create);
    await calls.update(ID, { permissions: [] });
    await calls.reset(ID);
    expect(apiSend.mock.calls).toEqual([
      ['POST', '/roles', create],
      ['PATCH', `/roles/${ID}`, { permissions: [] }],
      ['POST', `/roles/${ID}/reset`, undefined],
    ]);
  });

  it('sends DELETE /roles/:id and PATCH /users/:id/role with the role id', async () => {
    const { client, apiSend } = clientAnswering(staffUser);
    await roleCalls(client).assign(ID, { role_id: ID });
    expect(apiSend).toHaveBeenCalledWith('PATCH', `/users/${ID}/role`, { role_id: ID });
    apiSend.mockResolvedValue(undefined);
    await expect(roleCalls(client).remove(ID)).resolves.toBeUndefined();
    expect(apiSend).toHaveBeenLastCalledWith('DELETE', `/roles/${ID}`, undefined);
  });

  it('throws bad_response for a role with an unknown permission', async () => {
    const { client } = clientAnswering([{ ...role, permissions: ['nope'] }]);
    const failure = await roleCalls(client)
      .list()
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response', path: '/roles' } });
  });
});
