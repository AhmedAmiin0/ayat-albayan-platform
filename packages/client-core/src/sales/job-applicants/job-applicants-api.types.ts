import type { RouteResult } from '@ab/core';
import type {
  JobApplicantCreateBodyInput,
  JobApplicantListQueryInput,
  JobApplicantStatusBody,
  JobApplicantUpdateBodyInput,
  jobApplicantRoutes,
} from '@ab/shared';

type Answer<K extends keyof typeof jobApplicantRoutes> = Promise<
  RouteResult<(typeof jobApplicantRoutes)[K]>
>;

export interface JobApplicantEdit {
  id: string;
  body: JobApplicantUpdateBodyInput;
}

export interface JobApplicantMove extends JobApplicantStatusBody {
  id: string;
}

export interface JobApplicantCalls {
  list: (query: JobApplicantListQueryInput) => Answer<'list'>;
  get: (id: string) => Answer<'get'>;
  create: (body: JobApplicantCreateBodyInput) => Answer<'create'>;
  update: (input: JobApplicantEdit) => Answer<'update'>;
  changeStatus: (input: JobApplicantMove) => Answer<'changeStatus'>;
  remove: (id: string) => Answer<'remove'>;
}
