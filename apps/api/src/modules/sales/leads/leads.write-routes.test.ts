import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { applicant, lead, LEAD_ID } from './leads.fakes';
import { testApp } from './test-app';

let h: Awaited<ReturnType<typeof testApp>>;

beforeAll(async () => {
  h = await testApp();
});
afterAll(() => h.app.close());
beforeEach(() => vi.clearAllMocks());

const WRITES = [
  { method: 'PATCH', path: 'status', body: { status: 'lost' } },
  { method: 'POST', path: 'reclassify', body: undefined },
  { method: 'PATCH', path: 'qualification', body: { goal: 'حفظ' } },
  { method: 'PATCH', path: 'follow-up', body: { paused: true } },
] as const;

describe('lead writes served from their route objects', () => {
  it.each(WRITES)('$method $path: a teacher is refused with 403', async (w) => {
    const url = `/leads/${LEAD_ID}/${w.path}`;
    const res = await h.call({ method: w.method, url, token: 'teacher', body: w.body });
    expect(res.statusCode).toBe(403);
  });

  it.each(WRITES)('$method $path: a lead id that is not a uuid is a 400', async (w) => {
    const res = await h.call({ method: w.method, url: `/leads/abc/${w.path}`, body: w.body });
    expect(res.statusCode).toBe(400);
    expect(h.leads.findById).not.toHaveBeenCalled();
  });

  it('reclassify still answers 201 with the applicant', async () => {
    h.leads.findById.mockResolvedValue(lead());
    h.applicants.findByPhone.mockResolvedValue(applicant());
    const res = await h.call({ method: 'POST', url: `/leads/${LEAD_ID}/reclassify` });
    expect([res.statusCode, res.json().id]).toEqual([201, applicant().id]);
  });

  it('a follow-up pause with no body is a 400, not a pause', async () => {
    const res = await h.call({ method: 'PATCH', url: `/leads/${LEAD_ID}/follow-up` });
    expect(res.statusCode).toBe(400);
    expect(h.leads.update).not.toHaveBeenCalled();
  });
});
