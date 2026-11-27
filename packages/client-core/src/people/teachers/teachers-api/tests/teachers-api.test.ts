import type { TeacherCreate } from '@ab/shared';
import { teacherFixture } from '@ab/shared/testing';
import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../../core/http';
import { teacherCalls } from '../teachers-api';

const ID = '6f1c2b8e-0d0a-4c8e-9a51-2a6b0f6d9e11';
const teacher = teacherFixture({ id: ID });
const create: TeacherCreate = {
  display_name_ar: 'أ. سارة',
  gender: 'female',
  programs: ['quran'],
  status: 'active',
  tz: 'Africa/Cairo',
};

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('teacher calls (R-TCH-01)', () => {
  it('reads GET /teachers/:id', async () => {
    const { client, apiFetch } = clientAnswering(teacher);
    await expect(teacherCalls(client).get(ID)).resolves.toEqual(teacher);
    expect(apiFetch).toHaveBeenCalledWith(`/teachers/${ID}`);
  });

  it('sends POST /teachers with the new teacher', async () => {
    const { client, apiSend } = clientAnswering(teacher);
    await expect(teacherCalls(client).create(create)).resolves.toEqual(teacher);
    expect(apiSend).toHaveBeenCalledWith('POST', '/teachers', create);
  });

  it('sends PATCH /teachers/:id with only the changed username', async () => {
    const { client, apiSend } = clientAnswering(teacher);
    await teacherCalls(client).update(ID, { username: null });
    expect(apiSend).toHaveBeenCalledWith('PATCH', `/teachers/${ID}`, { username: null });
  });

  it('throws bad_response for a teacher without her meeting fields', async () => {
    const { client } = clientAnswering({ ...teacher, platform_classroom: undefined });
    const failure = await teacherCalls(client)
      .get(ID)
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response', path: `/teachers/${ID}` } });
  });
});
