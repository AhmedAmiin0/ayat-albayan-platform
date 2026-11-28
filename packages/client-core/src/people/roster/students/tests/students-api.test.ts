import {
  statusCountsFixture,
  studentProfileFixture,
  teacherOptionFixture,
} from '@ab/shared/testing';
import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../../core/http';
import { studentCalls } from '../students-api';

const ID = '11111111-1111-4111-8111-111111111111';
const TEACHER = '44444444-4444-4444-8444-444444444444';

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('student reads (R-STU-01)', () => {
  it('reads GET /students/:id', async () => {
    const profile = studentProfileFixture();
    const { client, apiFetch } = clientAnswering(profile);
    await expect(studentCalls(client).get(ID)).resolves.toEqual(profile);
    expect(apiFetch).toHaveBeenCalledWith(`/students/${ID}`);
  });

  it('reads the teacher options', async () => {
    const options = [teacherOptionFixture()];
    const { client, apiFetch } = clientAnswering(options);
    await expect(studentCalls(client).teacherOptions()).resolves.toEqual(options);
    expect(apiFetch).toHaveBeenCalledWith('/students/teacher-options');
  });

  it('reads the status counts under only the filters that are set', async () => {
    const counts = statusCountsFixture({ active: 4 });
    const { client, apiFetch } = clientAnswering(counts);
    const read = studentCalls(client).statusCounts({ teacher: TEACHER, program: undefined });
    await expect(read).resolves.toEqual(counts);
    expect(apiFetch).toHaveBeenCalledWith(`/students/status-counts?teacher=${TEACHER}`);
  });

  it('reads the status counts with no filter as the bare path', async () => {
    const { client, apiFetch } = clientAnswering(statusCountsFixture());
    await studentCalls(client).statusCounts({});
    expect(apiFetch).toHaveBeenCalledWith('/students/status-counts');
  });

  it('throws bad_response for counts that miss a status', async () => {
    const { client } = clientAnswering({ active: 1 });
    const failure = await studentCalls(client)
      .statusCounts({})
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });

  it('throws bad_response for a profile without its siblings', async () => {
    const { siblings: _siblings, ...bare } = studentProfileFixture();
    const { client } = clientAnswering(bare);
    const failure = await studentCalls(client)
      .get(ID)
      .catch((e: unknown) => e);
    expect(failure).toMatchObject({ body: { code: 'bad_response', path: `/students/${ID}` } });
  });
});
