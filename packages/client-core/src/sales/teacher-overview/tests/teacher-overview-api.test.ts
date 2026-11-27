import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../core/http';
import { teacherOverviewCalls } from '../teacher-overview-api';

const ID = 'c1111111-1111-4111-8111-111111111111';
const TOTALS = {
  held: 1,
  student_absent: 0,
  cancelled_by_teacher: 0,
  cancelled_by_admin: 0,
  other: 0,
};
const OVERVIEW = { weekly: [], attendance: { days: 30, totals: TOTALS, latest: [] } };

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend: vi.fn() };
  return { client, apiFetch };
};

describe('teacher overview calls', () => {
  it('reads one teacher on the path of today', async () => {
    const { client, apiFetch } = clientAnswering(OVERVIEW);
    await expect(teacherOverviewCalls(client).overview(ID)).resolves.toEqual(OVERVIEW);
    expect(apiFetch).toHaveBeenCalledWith(`/sales/teachers/${ID}/overview`);
  });

  it('throws bad_response for totals missing a kind', async () => {
    const attendance = { ...OVERVIEW.attendance, totals: { held: 1 } };
    const { client } = clientAnswering({ ...OVERVIEW, attendance });
    const failure = await teacherOverviewCalls(client)
      .overview(ID)
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });
});
