import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../core/http';
import { myStudentsCall } from './teacher-students-api';

const student = {
  id: 's1',
  code: 'AB-0001',
  name: 'Ali',
  status: 'trial',
  program: 'quran',
  level: 'juz 30',
  age: null,
  next_lesson_at: '2026-11-27T15:00:00Z',
};

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend: vi.fn() };
  return { client, apiFetch };
};

describe('myStudentsCall', () => {
  it('reads one kind of my students', async () => {
    const { client, apiFetch } = clientAnswering([student]);
    await expect(myStudentsCall(client)('trial')).resolves.toEqual([student]);
    expect(apiFetch).toHaveBeenCalledWith('/teachers/me/students?kind=trial');
  });

  it('refuses a row that carries no program', async () => {
    const { program: _program, ...bare } = student;
    const { client } = clientAnswering([bare]);
    const failure = await myStudentsCall(client)('trial').catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });
});
