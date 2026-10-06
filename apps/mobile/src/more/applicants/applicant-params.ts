import { JOB_APPLICANT_STATUSES, type JobApplicantStatus } from '@ab/shared';
import { t } from '@/lib/i18n';
import type { ListParams } from '@/lib/query-keys';

export type ApplicantStatusFilter = 'all' | JobApplicantStatus;

/** The «ترتيب الطلبات» choices; '' is the API's default (newest first). `key:desc` = descending. */
export const applicantSortChoices = (): { value: string; label: string }[] => [
  { value: '', label: t.leads.sort.newest },
  { value: 'created_at', label: t.leads.sort.oldest },
  { value: 'name', label: t.leads.sort.name },
  { value: 'status', label: t.leads.sort.status },
];

const KEYS = ['created_at', 'name', 'status'];

/** GET /job-applicants params (the web's `status`, `sort`, `dir`); an unknown sort value is the default. */
export function applicantParams(status: ApplicantStatusFilter, sortValue: string): ListParams {
  const [key, dir] = sortValue.split(':');
  const sort = KEYS.find((k) => k === key);
  return {
    status: JOB_APPLICANT_STATUSES.find((s) => s === status),
    sort,
    dir: sort && dir === 'desc' ? 'desc' : undefined,
  };
}

/** Only web links open from the app (a stored `javascript:` or `file:` value never reaches the OS). */
export const safeLink = (url: string | null | undefined): string | null =>
  url && /^https?:\/\//i.test(url.trim()) ? url.trim() : null;
