import { jobApplicant, leadRow } from '@ab/shared/testing';
import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../core/http';
import { leadWriteCalls } from '../leads-api';

const LEAD_ROW = leadRow();
const ID = LEAD_ROW.id;
const APPLICANT = jobApplicant({ from_lead_id: ID });

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiSend };
};

describe('lead write calls', () => {
  it('sends the status, the qualification patch and the pause on the paths of today', async () => {
    const { client, apiSend } = clientAnswering(LEAD_ROW);
    const calls = leadWriteCalls(client);
    await expect(calls.changeStatus({ id: ID, status: 'lost' })).resolves.toEqual(LEAD_ROW);
    await calls.qualification({ id: ID, patch: { goal: null } });
    await calls.followUp({ id: ID, paused: true });
    expect(apiSend.mock.calls).toEqual([
      ['PATCH', `/leads/${ID}/status`, { status: 'lost' }],
      ['PATCH', `/leads/${ID}/qualification`, { goal: null }],
      ['PATCH', `/leads/${ID}/follow-up`, { paused: true }],
    ]);
  });

  it('reclassifies with no body and answers the new applicant', async () => {
    const { client, apiSend } = clientAnswering(APPLICANT);
    await expect(leadWriteCalls(client).reclassify(ID)).resolves.toEqual(APPLICANT);
    expect(apiSend).toHaveBeenCalledWith('POST', `/leads/${ID}/reclassify`, undefined);
  });

  it('throws bad_response for a lead with a status the catalogue does not know', async () => {
    const { client } = clientAnswering({ ...LEAD_ROW, status: 'gone' });
    const failure = await leadWriteCalls(client)
      .followUp({ id: ID, paused: false })
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });
});
