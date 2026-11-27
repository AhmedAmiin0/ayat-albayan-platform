import { describe, expect, it } from 'vitest';
import { jobApplicantRoutes } from '../../job-applicants';
import { registrationCheckRoutes } from '../../registration-check';
import { usedBeforeRoutes } from '../../used-before/used-before.routes';
import { salesTeacherOverviewRoutes } from '../teacher-overview.routes';

const accessOf = (routes: Record<string, { permissions?: unknown; tags?: unknown }>) =>
  Object.fromEntries(Object.entries(routes).map(([k, r]) => [k, [r.permissions, r.tags]]));

const READ = [['applicants.read'], ['job-applicants']];
const WRITE = [['applicants.write'], ['job-applicants']];

describe('sales route objects carry the permission and the tag their handlers had', () => {
  it('job applicants: read for list and get, write for the rest', () => {
    expect(accessOf(jobApplicantRoutes)).toEqual({
      list: READ,
      get: READ,
      create: WRITE,
      update: WRITE,
      changeStatus: WRITE,
      remove: WRITE,
    });
  });

  it('used-before: subscriptions.edit_terms under subscriptions', () => {
    const access = [['subscriptions.edit_terms'], ['subscriptions']];
    expect(accessOf(usedBeforeRoutes)).toEqual({ state: access, edit: access });
  });

  it('registration check and teacher overview: under sales', () => {
    expect(accessOf(registrationCheckRoutes)).toEqual({
      check: [['students.check_registration'], ['sales']],
    });
    expect(accessOf(salesTeacherOverviewRoutes)).toEqual({
      overview: [['self.sales_academy'], ['sales']],
    });
  });
});
