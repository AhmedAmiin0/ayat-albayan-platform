import { salesStudentDetails } from '@ab/shared/testing';
import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../core/http';
import { salesStudentFileCalls } from '../student-file-api';

const ID = '11111111-1111-4111-8111-111111111111';

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend: vi.fn() };
  return { client, apiFetch };
};

describe('sales student details call', () => {
  it('reads the student file on the path of today', async () => {
    const answer = salesStudentDetails();
    const { client, apiFetch } = clientAnswering(answer);
    await expect(salesStudentFileCalls(client).details(ID)).resolves.toEqual(answer);
    expect(apiFetch).toHaveBeenCalledWith(`/sales/students/${ID}`);
  });

  it('throws bad_response for a student with an unknown status', async () => {
    const answer = salesStudentDetails();
    const odd = { ...answer, student: { ...answer.student, status: 'gone' } };
    const failure = await salesStudentFileCalls(clientAnswering(odd).client)
      .details(ID)
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });
});
