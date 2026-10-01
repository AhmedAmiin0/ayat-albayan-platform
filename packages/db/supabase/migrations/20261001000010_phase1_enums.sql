-- Phase 1 enums. Mirrored in packages/shared/src/enums.
-- TODO(R-LEAD-04): docs define no job-applicant statuses; owner to confirm this minimal set.
create type public.job_applicant_status as enum ('new', 'contacted', 'accepted', 'rejected');
