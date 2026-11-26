import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import { pastEnd, rangesOn } from '@/common/db/testing/past-end';
import { JobApplicantsRepo } from './job-applicants.repo';

const T = 'job_applicants';

describe('JobApplicantsRepo.list past the last page', () => {
  it('answers no rows with the real total', async () => {
    const fake = fakeDb({ [T]: pastEnd(5) });
    const page = await new JobApplicantsRepo(fake.db).list({ page: 2, pageSize: 25 });
    expect(page).toEqual({ items: [], total: 5 });
    expect(rangesOn(fake, T)).toEqual([[25, 49], [0, 0]]);
  });
});
