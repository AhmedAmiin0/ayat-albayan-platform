import { APPLICANT_FILTER_KEYS, APPLICANT_SORT_KEYS } from '@ab/shared';
import { createFileRoute } from '@tanstack/react-router';
import { JobApplicantsList } from '@/features/leads/JobApplicantsList';
import { listUrlValidator, parseListUrl, toListUrl } from '@/lib/list/list-url';

const KEYS = { sortKeys: APPLICANT_SORT_KEYS, filterKeys: APPLICANT_FILTER_KEYS };

/** /admin/job-applicants: `?page=&sort=&dir=desc&f_<key>=` (R-LEAD-04, R-NFR-08). */
export const Route = createFileRoute('/admin/(people)/job-applicants')({
  validateSearch: listUrlValidator(KEYS),
  component: JobApplicantsRoute,
});

function JobApplicantsRoute() {
  const search = parseListUrl(Route.useSearch(), KEYS);
  const navigate = Route.useNavigate();
  return <JobApplicantsList search={search} onSearch={(next) => void navigate({ search: toListUrl(next) })} />;
}
