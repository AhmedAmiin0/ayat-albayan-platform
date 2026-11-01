import { ConflictException } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { applicant, APPLICANT_ID } from '@/modules/sales/leads/leads.fakes';
import { testApp } from '@/modules/sales/leads/test-app';

let h: Awaited<ReturnType<typeof testApp>>;

beforeAll(async () => {
  h = await testApp();
});
afterAll(() => h.app.close());

const url = (suffix = '') => `/job-applicants${suffix}`;

describe('JobApplicantsController HTTP (R-LEAD-04)', () => {
  it('is admin-only: a teacher gets 403', async () => {
    expect((await h.call({ method: 'GET', url: url(), token: 'teacher' })).statusCode).toBe(403);
  });

  it('POST normalises the phone and ignores status/from_lead_id in the body', async () => {
    h.applicants.insert.mockResolvedValue(applicant());
    const body = { phone_e164: '01001234567', name: 'أ. منى', status: 'accepted', from_lead_id: null };
    const res = await h.call({ method: 'POST', url: url(), body });
    expect(res.statusCode).toBe(201);
    expect(h.applicants.insert).toHaveBeenCalledWith({
      phone_e164: '+201001234567',
      name: 'أ. منى',
      created_by: 'admin-1',
    });
  });

  it('POST with a bad phone is 400; a duplicate phone is 409', async () => {
    const bad = await h.call({ method: 'POST', url: url(), body: { phone_e164: 'abc' } });
    expect(bad.statusCode).toBe(400);
    expect(bad.json()).toMatchObject({ message: 'validation_failed', issues: [expect.objectContaining({ path: 'phone_e164' })] });
    h.applicants.insert.mockRejectedValue(new ConflictException({ code: 'duplicate_phone' }));
    const dup = await h.call({ method: 'POST', url: url(), body: { phone_e164: '+201001234567' } });
    expect(dup.statusCode).toBe(409);
  });

  it('PATCH :id rejects an empty update with 400', async () => {
    expect((await h.call({ method: 'PATCH', url: url(`/${APPLICANT_ID}`), body: {} })).statusCode).toBe(
      400,
    );
  });

  it('PATCH :id/status validates against the pipeline values', async () => {
    const statusUrl = url(`/${APPLICANT_ID}/status`);
    const bad = await h.call({ method: 'PATCH', url: statusUrl, body: { status: 'contacted' } });
    expect(bad.statusCode).toBe(400);
    h.applicants.findById.mockResolvedValue(applicant({ status: 'new' }));
    h.applicants.moveStatus.mockResolvedValue(applicant());
    const ok = await h.call({ method: 'PATCH', url: statusUrl, body: { status: 'reviewing' } });
    expect(ok.statusCode).toBe(200);
  });

  it('DELETE :id is 204', async () => {
    h.applicants.findById.mockResolvedValue(applicant());
    const res = await h.call({ method: 'DELETE', url: url(`/${APPLICANT_ID}`) });
    expect(res.statusCode).toBe(204);
    expect(h.applicants.remove).toHaveBeenCalledWith(APPLICANT_ID);
  });
});
