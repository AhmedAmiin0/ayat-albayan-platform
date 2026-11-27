-- Counts the job applicant rows the applicant answer schema would refuse (docs/62 Decisions, read-only).
-- count: job_applicants_total
select count(*) from public.job_applicants;

-- count: job_applicants_missing_phone_or_status
select count(*) from public.job_applicants where phone_e164 is null or status is null;

-- count: job_applicants_missing_times
select count(*) from public.job_applicants where created_at is null or updated_at is null;
