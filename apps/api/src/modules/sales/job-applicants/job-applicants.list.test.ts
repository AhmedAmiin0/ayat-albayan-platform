import { describe, expect, it } from 'vitest';
import { fakeDb } from '../../people/guardians/fake-db';
import { JobApplicantsQueries, type ApplicantListFilter } from './job-applicants.queries';

const page = { page: 1, pageSize: 25 };

async function list(f: ApplicantListFilter) {
  const fake = fakeDb({ job_applicants: [{ data: [], count: 0 }] });
  await new JobApplicantsQueries(fake.db).list(f);
  return (method: string) => fake.calls.filter((c) => c.method === method).map((c) => c.args);
}

describe('GET /job-applicants sort + column filters (R-LEAD-04, R-NFR-08)', () => {
  it('default: newest first, as before', async () => {
    const of = await list(page);
    expect(of('order')).toEqual([['created_at', { ascending: false }]]);
  });

  it('a key → its column, newest first as the tiebreaker', async () => {
    const of = await list({ ...page, sort: 'name', dir: 'desc' });
    expect(of('order')).toEqual([
      ['name', { ascending: false, nullsFirst: false }],
      ['created_at', { ascending: false }],
    ]);
  });

  it('created_at ascending is the oldest first, without a second order', async () => {
    const of = await list({ ...page, sort: 'created_at' });
    expect(of('order')).toEqual([['created_at', { ascending: true }]]);
  });

  it('text filters: name, phone digits, notes', async () => {
    const of = await list({ ...page, name: 'ريم', phone: '+20 100', notes: 'حفص' });
    expect(of('ilike')).toEqual([
      ['name', '%ريم%'],
      ['phone_e164', '%20100%'],
      ['notes', '%حفص%'],
    ]);
  });

  it('link columns: present → not null, missing → is null; status stays eq', async () => {
    const of = await list({ ...page, cv: 'yes', recitation: 'no', status: 'new' });
    expect(of('not')).toEqual([['cv_url', 'is', null]]);
    expect(of('is')).toEqual([['recitation_url', null]]);
    expect(of('eq')).toEqual([['status', 'new']]);
  });
});
