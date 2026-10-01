import { createFileRoute } from '@tanstack/react-router';
import { JobApplicantsList } from '@/features/leads/JobApplicantsList';
import { parsePageSearch } from '@/features/leads/types';

export const Route = createFileRoute('/admin/job-applicants')({
  validateSearch: parsePageSearch,
  component: JobApplicantsRoute,
});

function JobApplicantsRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return <JobApplicantsList search={search} onSearch={(next) => navigate({ search: next })} />;
}
