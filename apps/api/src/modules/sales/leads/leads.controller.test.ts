import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { applicant, lead, LEAD_ID } from './leads.fakes';
import { testApp } from './test-app';

let h: Awaited<ReturnType<typeof testApp>>;

beforeAll(async () => {
  h = await testApp();
});
afterAll(() => h.app.close());
beforeEach(() => {
  h.leads.findById.mockReset();
  h.leads.list.mockReset();
});

describe('LeadsController HTTP (R-LEAD-01, R-LEAD-04)', () => {
  it('is admin-only: a teacher gets 403', async () => {
    expect((await h.call({ method: 'GET', url: '/leads', token: 'teacher' })).statusCode).toBe(403);
  });

  it('GET /leads parses filters and paging from the query string', async () => {
    h.leads.list.mockResolvedValue({ items: [lead()], total: 1 });
    const res = await h.call({ method: 'GET', url: '/leads?status=no_reply&q=0501&page=2' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ total: 1, page: 2, pageSize: 25 });
    expect(h.leads.list).toHaveBeenCalledWith({ status: 'no_reply', q: '0501', page: 2, pageSize: 25 });
  });

  it('GET /leads with an unknown status is 400, not 500', async () => {
    expect((await h.call({ method: 'GET', url: '/leads?status=bogus' })).statusCode).toBe(400);
  });

  it('PATCH status: invalid body 400, forbidden move 409 invalid_transition', async () => {
    const url = `/leads/${LEAD_ID}/status`;
    expect((await h.call({ method: 'PATCH', url, body: { status: 'x' } })).statusCode).toBe(400);
    h.leads.findById.mockResolvedValue(lead({ status: 'converted' }));
    const res = await h.call({ method: 'PATCH', url, body: { status: 'new' } });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ code: 'invalid_transition', from: 'converted', to: 'new' });
  });

  it('PATCH status records the acting admin in the audit log', async () => {
    h.leads.findById.mockResolvedValue(lead({ status: 'new' }));
    h.leads.moveStatus.mockResolvedValue(lead({ status: 'no_reply' }));
    const url = `/leads/${LEAD_ID}/status`;
    const res = await h.call({ method: 'PATCH', url, body: { status: 'no_reply' } });
    expect(res.statusCode).toBe(200);
    expect(h.audit.record).toHaveBeenCalledWith(expect.objectContaining({ actorId: 'admin-1' }));
  });

  it('PATCH with a non-uuid id is 400', async () => {
    const res = await h.call({ method: 'PATCH', url: '/leads/abc/status', body: { status: 'lost' } });
    expect(res.statusCode).toBe(400);
  });

  it('POST /leads/:id/reclassify returns the new applicant (201)', async () => {
    h.leads.findById.mockResolvedValue(lead());
    h.applicants.insert.mockResolvedValue(applicant());
    const res = await h.call({ method: 'POST', url: `/leads/${LEAD_ID}/reclassify` });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ id: applicant().id });
    expect(h.leads.remove).toHaveBeenCalledWith(LEAD_ID);
  });

  it('L1 PATCH /leads/:id/qualification merges (null clears); bad values are 400', async () => {
    h.leads.findById.mockResolvedValue(lead({ qualification: { age: 9, goal: 'حفظ' } }));
    h.leads.update.mockImplementation(async (_id: string, patch: object) => ({ ...lead(), ...patch }));
    const res = await h.call({ method: 'PATCH', url: `/leads/${LEAD_ID}/qualification`, body: { goal: null, riwaya: 'حفص' } });
    expect([res.statusCode, res.json().qualification]).toEqual([200, { age: 9, riwaya: 'حفص' }]);
    const bad = await h.call({ method: 'PATCH', url: `/leads/${LEAD_ID}/qualification`, body: { age: 'tween' } });
    expect(bad.statusCode).toBe(400);
  });

  it('L2 PATCH /leads/:id/follow-up needs a boolean', async () => {
    const res = await h.call({ method: 'PATCH', url: `/leads/${LEAD_ID}/follow-up`, body: { paused: 'yes' } });
    expect(res.statusCode).toBe(400);
  });
});
