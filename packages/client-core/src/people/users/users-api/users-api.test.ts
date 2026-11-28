import type { UserCreate } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../core/http';
import { userCalls } from './users-api';

const ID = '6f1c2b8e-0d0a-4c8e-9a51-2a6b0f6d9e11';
const view = {
  id: ID,
  email: 'a@b.co',
  full_name: 'سارة',
  phone_e164: null,
  role: 'assistant',
  role_id: null,
  role_key: null,
  status: 'active',
  disabled_at: null,
  last_sign_in_at: null,
  created_at: '2026-11-01T00:00:00.000Z',
  linked: null,
};
const detail = { ...view, locale: 'ar', tz: 'Asia/Riyadh', disabled_reason: null };
const issued = { user: detail, credential: { kind: 'password', value: 'secret-1' } };
const create: UserCreate = {
  email: 'n@b.co',
  full_name: 'علي',
  role: 'sales',
  credential: 'generate',
};

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('user calls', () => {
  it('reads the page with its filters, blank ones left out', async () => {
    const page = { items: [view], total: 1, page: 2, pageSize: 20 };
    const { client, apiFetch } = clientAnswering(page);
    const query = { page: 2, pageSize: 20, q: '', role: 'sales', status: undefined };
    await expect(userCalls(client).list(query)).resolves.toEqual(page);
    expect(apiFetch).toHaveBeenCalledWith('/users?page=2&pageSize=20&role=sales');
  });

  it('reads the role options, the link candidates and one user', async () => {
    const options = clientAnswering([]);
    await userCalls(options.client).roleOptions();
    expect(options.apiFetch).toHaveBeenCalledWith('/users/role-options');
    const found = clientAnswering([{ kind: 'student', id: ID, name: 'أحمد', code: 'AB-0001' }]);
    await userCalls(found.client).linkCandidates({ kind: 'student', q: 'أ' });
    expect(found.apiFetch).toHaveBeenCalledWith('/users/link-candidates?kind=student&q=%D8%A3');
    const one = clientAnswering(detail);
    await expect(userCalls(one.client).read(ID)).resolves.toEqual(detail);
    expect(one.apiFetch).toHaveBeenCalledWith(`/users/${ID}`);
  });

  it('sends create, update, disable and reset with their bodies', async () => {
    const { client, apiSend } = clientAnswering(issued);
    const calls = userCalls(client);
    await expect(calls.create(create)).resolves.toEqual(issued);
    await calls.resetPassword(ID, { credential: 'link' });
    apiSend.mockResolvedValue(detail);
    await calls.update(ID, { full_name: 'سارة علي' });
    await calls.disable(ID, { reason: 'left' });
    await calls.enable(ID);
    expect(apiSend.mock.calls).toEqual([
      ['POST', '/users', create],
      ['POST', `/users/${ID}/reset-password`, { credential: 'link' }],
      ['PATCH', `/users/${ID}`, { full_name: 'سارة علي' }],
      ['POST', `/users/${ID}/disable`, { reason: 'left' }],
      ['POST', `/users/${ID}/enable`, undefined],
    ]);
  });

  it('answers nothing for sign-out and delete', async () => {
    const { client, apiSend } = clientAnswering(undefined);
    await expect(userCalls(client).signOut(ID)).resolves.toBeUndefined();
    await expect(userCalls(client).remove(ID)).resolves.toBeUndefined();
    expect(apiSend.mock.calls).toEqual([
      ['POST', `/users/${ID}/sign-out`, undefined],
      ['DELETE', `/users/${ID}`, undefined],
    ]);
  });

  it('throws bad_response for a user with an unknown role', async () => {
    const { client } = clientAnswering({ ...detail, role: 'owner' });
    const error = await userCalls(client)
      .read(ID)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ body: { code: 'bad_response', path: `/users/${ID}` } });
  });
});
