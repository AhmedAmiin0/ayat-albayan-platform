import { studentRowFixture } from '@ab/shared/testing';
import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../../core/http';
import { studentCalls } from '../students-api';

const ID = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';

const clientAnswering = (answer: unknown) => {
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch: vi.fn(), apiSend };
  return { client, apiSend };
};

const create = {
  name: 'سهيلة',
  age: 9,
  gender: 'female' as const,
  tz: 'Asia/Riyadh',
  program: 'quran' as const,
  guardian: { name: 'أم سهيلة', phone_e164: '+966501234567', tz: 'Asia/Riyadh', source: null },
  force: false,
};

describe('student writes (R-STU-02, R-STU-03, R-STU-05)', () => {
  it('sends POST /students with the new student', async () => {
    const row = studentRowFixture();
    const { client, apiSend } = clientAnswering(row);
    await expect(studentCalls(client).create(create)).resolves.toEqual(row);
    expect(apiSend).toHaveBeenCalledWith('POST', '/students', create);
  });

  it('sends PATCH /students/:id with only the changed fields', async () => {
    const { client, apiSend } = clientAnswering(studentRowFixture({ status: 'paused' }));
    await studentCalls(client).update(ID, { status: 'paused', expected_status: 'active' });
    const patch = { status: 'paused', expected_status: 'active' };
    expect(apiSend).toHaveBeenCalledWith('PATCH', `/students/${ID}`, patch);
  });

  it('sends POST /students/:id/merge with the student folded into the kept one', async () => {
    const { client, apiSend } = clientAnswering({ merge_id: 'm1' });
    const merged = studentCalls(client).merge({ keptId: ID, mergedId: OTHER });
    await expect(merged).resolves.toEqual({ merge_id: 'm1' });
    expect(apiSend).toHaveBeenCalledWith('POST', `/students/${ID}/merge`, { merged_id: OTHER });
  });

  it('throws bad_response for a create answer that is only a reference', async () => {
    const { client } = clientAnswering({ id: ID, code: null, name: 'سهيلة', status: 'new' });
    const failure = await studentCalls(client)
      .create(create)
      .catch((e: unknown) => e);
    expect(failure).toMatchObject({ body: { code: 'bad_response', path: '/students' } });
  });
});
