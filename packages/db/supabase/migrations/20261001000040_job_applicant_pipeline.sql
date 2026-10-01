-- Job-applicant pipeline: new → reviewing → interview → accepted | rejected. R-LEAD-04.
-- Replaces the placeholder 'contacted' (migration 010) before any data exists; then the enum
-- holds exactly the five pipeline values. After applying: gen:types, update
-- packages/shared JOB_APPLICANT_STATUSES and ar.json enums.jobApplicantStatus.
alter type public.job_applicant_status rename value 'contacted' to 'reviewing';
alter type public.job_applicant_status add value if not exists 'interview' before 'accepted';
