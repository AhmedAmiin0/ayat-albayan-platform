import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { applicant, APPLICANT_ID } from '@/modules/sales/leads/leads.fakes';
import { testApp } from '@/modules/sales/leads/test-app';

let h: Awaited<ReturnType<typeof testApp>>;

beforeAll(async () => {
  h = await testApp();
});
afterAll(() => h.app.close());
beforeEach(() => {
  h.applicants.findById.mockResolvedValue(applicant({ name: 'منى' }));
});

const url = (suffix = '') => `/job-applicants${suffix}`;

describe('job applicant routes served from their route objects (R-LEAD-04)', () => {
  it('GET :id answers the applicant with every column', async () => {
    const res = await h.call({ method: 'GET', url: url(`/${APPLICANT_ID}`) });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(applicant({ name: 'منى' }));
  });

  it('a malformed :id answers the validation_failed envelope', async () => {
    for (const suffix of ['/x', '/x/status']) {
      const method = suffix === '/x' ? 'GET' : 'PATCH';
      const res = await h.call({ method, url: url(suffix), body: { status: 'reviewing' } });
      expect([res.statusCode, res.json<{ message: string }>().message]).toEqual([
        400,
        'validation_failed',
      ]);
    }
  });

  it('a row outside the answer schema is a 500 response_invalid', async () => {
    h.applicants.findById.mockResolvedValue(applicant({ created_at: 'yesterday' }));
    const res = await h.call({ method: 'GET', url: url(`/${APPLICANT_ID}`) });
    expect([res.statusCode, res.json<{ code: string }>().code]).toEqual([500, 'response_invalid']);
  });

  it('GET pages the list through the shared query', async () => {
    h.applicants.list.mockResolvedValue({ items: [applicant()], total: 1 });
    const res = await h.call({ method: 'GET', url: url('?status=&cv=yes&q=x&page=2') });
    expect(res.json()).toEqual({ items: [applicant()], total: 1, page: 2, pageSize: 25 });
    expect(h.applicants.list).toHaveBeenCalledWith(
      expect.objectContaining({ status: undefined, cv: 'yes', q: 'x', page: 2, pageSize: 25 }),
    );
  });

  it('PATCH :id passes only the sent keys to the repo', async () => {
    h.applicants.update.mockResolvedValue(applicant({ notes: 'جيد' }));
    const res = await h.call({ method: 'PATCH', url: url(`/${APPLICANT_ID}`), body: { notes: 'جيد' } });
    expect(res.statusCode).toBe(200);
    expect(h.applicants.update).toHaveBeenCalledWith(APPLICANT_ID, { notes: 'جيد' });
  });
});
