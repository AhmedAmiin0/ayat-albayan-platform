import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../core/http';
import { jobApplicantCalls } from '../job-applicants-api';

const ID = 'a1111111-1111-4111-8111-111111111111';
const PATH = `/job-applicants/${ID}`;
const APPLICANT = {
  id: ID,
  phone_e164: '+201001234567',
  name: 'منى',
  status: 'new',
  cv_url: null,
  recitation_url: null,
  notes: null,
  from_lead_id: null,
  created_by: null,
  created_at: '2026-11-27T03:00:00+00:00',
  updated_at: '2026-11-27T03:00:00+00:00',
};

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('job applicant calls', () => {
  it('reads one page with its sort and filters', async () => {
    const page = { items: [APPLICANT], total: 1, page: 2, pageSize: 25 };
    const { client, apiFetch } = clientAnswering(page);
    const query = { page: 2, pageSize: 25, sort: 'name', dir: 'desc', cv: 'yes' } as const;
    await expect(jobApplicantCalls(client).list(query)).resolves.toEqual(page);
    expect(apiFetch).toHaveBeenCalledWith(
      '/job-applicants?page=2&pageSize=25&sort=name&dir=desc&cv=yes',
    );
  });

  it('reads, creates and edits an applicant on the paths of today', async () => {
    const { client, apiFetch, apiSend } = clientAnswering(APPLICANT);
    const calls = jobApplicantCalls(client);
    await expect(calls.get(ID)).resolves.toEqual(APPLICANT);
    expect(apiFetch).toHaveBeenCalledWith(PATH);
    await calls.create({ phone_e164: '+201001234567' });
    await calls.update({ id: ID, body: { notes: 'جيد' } });
    await calls.changeStatus({ id: ID, status: 'reviewing' });
    expect(apiSend.mock.calls).toEqual([
      ['POST', '/job-applicants', { phone_e164: '+201001234567' }],
      ['PATCH', PATH, { notes: 'جيد' }],
      ['PATCH', `${PATH}/status`, { status: 'reviewing' }],
    ]);
  });

  it('deletes an applicant with no body', async () => {
    const { client, apiSend } = clientAnswering(undefined);
    await jobApplicantCalls(client).remove(ID);
    expect(apiSend).toHaveBeenCalledWith('DELETE', PATH, undefined);
  });

  it('throws bad_response for an applicant outside the pipeline', async () => {
    const { client } = clientAnswering({ ...APPLICANT, status: 'contacted' });
    const failure = await jobApplicantCalls(client)
      .get(ID)
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });
});
