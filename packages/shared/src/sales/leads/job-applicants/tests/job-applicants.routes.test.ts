import { describe, expect, it } from 'vitest';
import { jobApplicantRoutes as routes } from '../job-applicants.routes';

const ID = 'a1111111-1111-4111-8111-111111111111';
const APPLICANT = {
  id: ID,
  phone_e164: '+201001234567',
  name: 'منى',
  status: 'reviewing',
  cv_url: 'https://example.com/cv.pdf',
  recitation_url: null,
  notes: null,
  from_lead_id: null,
  created_by: null,
  created_at: '2026-11-27T03:00:00+00:00',
  updated_at: '2026-11-27T03:00:00+00:00',
};

describe('jobApplicantRoutes', () => {
  it('keeps the paths the api serves today', () => {
    const lines = Object.values(routes).map((r) => `${r.method} ${r.path}`);
    expect(lines).toEqual([
      'GET /job-applicants',
      'GET /job-applicants/:id',
      'POST /job-applicants',
      'PATCH /job-applicants/:id',
      'PATCH /job-applicants/:id/status',
      'DELETE /job-applicants/:id',
    ]);
  });

  it('pages the list with its status, search and column filters', () => {
    const query = routes.list.query.parse({ status: '', q: 'منى', cv: 'yes', sort: 'name' });
    expect(query).toMatchObject({ page: 1, pageSize: 25, q: 'منى', cv: 'yes', sort: 'name' });
    expect(query.status).toBeUndefined();
    expect(routes.list.query.safeParse({ status: 'contacted' }).success).toBe(false);
    const page = { items: [APPLICANT], total: 1, page: 1, pageSize: 25 };
    expect(routes.list.response.parse(page)).toEqual(page);
  });

  it('answers every column of an applicant and refuses a status outside the pipeline', () => {
    expect(routes.get.response.parse(APPLICANT)).toEqual(APPLICANT);
    expect(routes.get.response.safeParse({ ...APPLICANT, status: 'contacted' }).success).toBe(false);
    expect(routes.get.params.safeParse({ id: 'x' }).success).toBe(false);
  });

  it('creates without a status or a lead, which only the pipeline and reclassify set', () => {
    const body = { phone_e164: '01001234567', status: 'accepted', from_lead_id: ID };
    expect(routes.create.body.parse(body)).toEqual({ phone_e164: '+201001234567' });
  });

  it('edits only what was sent and refuses an empty edit', () => {
    expect(routes.update.body.parse({ notes: 'جيد' })).toEqual({ notes: 'جيد' });
    const empty = routes.update.body.safeParse({});
    expect(empty.error?.issues[0]?.message).toBe('empty_update');
    expect(routes.update.body.parse({ status: 'accepted', notes: 'x' })).toEqual({ notes: 'x' });
  });

  it('moves the status only to a pipeline value', () => {
    expect(routes.changeStatus.body.parse({ status: 'interview' })).toEqual({ status: 'interview' });
    expect(routes.changeStatus.body.safeParse({ status: 'contacted' }).success).toBe(false);
    expect(routes.changeStatus.response.parse(APPLICANT)).toEqual(APPLICANT);
  });

  it('answers nothing for the delete', () => {
    expect(routes.remove.response).toBe('empty');
  });
});
