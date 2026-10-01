import { describe, expect, it } from 'vitest';
import { fakeDb } from '../guardians/fake-db';
import { JobApplicantsQueries } from '../job-applicants/job-applicants.queries';
import { LeadsQueries } from './leads.queries';

const page = { page: 1, pageSize: 25 };

describe('inbox search (R-LEAD-01): a phone in any format finds the E.164 row', () => {
  it.each(['0552147730', '+966 55 214 7730', '٠٥٥٢١٤٧٧٣٠'])('leads: %s', async (q) => {
    const { db, argsOf } = fakeDb({ leads: [{ data: [], count: 0 }] });
    await new LeadsQueries(db).list({ ...page, q });
    expect(argsOf('leads', 'or')).toEqual(['phone_e164.ilike.*966552147730*']);
  });

  it('leads: a name searches the name only', async () => {
    const { db, argsOf } = fakeDb({ leads: [{ data: [], count: 0 }] });
    await new LeadsQueries(db).list({ ...page, q: 'ام جود' });
    expect(argsOf('leads', 'or')).toEqual(['name.ilike.*ام جود*']);
  });

  it('job applicants: same rule', async () => {
    const { db, argsOf } = fakeDb({ job_applicants: [{ data: [], count: 0 }] });
    await new JobApplicantsQueries(db).list({ ...page, q: '01001234567' });
    expect(argsOf('job_applicants', 'or')).toEqual(['phone_e164.ilike.*201001234567*']);
  });
});
