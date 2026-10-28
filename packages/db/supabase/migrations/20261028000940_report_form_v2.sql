-- The new lesson report form (owner 2026-10-26 «design a better one», docs/design/report-form):
-- memorization by surah and ayah, content per program, a better family report. Additive only:
-- every existing report keeps form_version 1 and content null, and renders exactly as before.
-- The API creates v2 drafts only while settings.report_form_v2 is on (seeded by the config
-- seeder as JSON null = its default false).
--
-- content (form_version 2), validated by @ab/shared reportContentSchema:
--   { segments: [{ kind: recited|new|revision, surah, from, to, grade }], tajweed,
--     arabic: { topic, skills }, islamic: { domain, topic, memorized, rates }, quick: [...] }
-- The grade columns (recitation / memorization / revision / overall) are still written from it,
-- so the history chart, the lists and the payouts read a v2 report like any other.
alter table public.lesson_reports
  add column form_version smallint not null default 1,
  add column content jsonb;
alter table public.lesson_reports
  add constraint lesson_reports_form_version_check check (form_version in (1, 2)),
  add constraint lesson_reports_content_v2_check check (content is null or form_version = 2),
  add constraint lesson_reports_content_object_check check (content is null or jsonb_typeof(content) = 'object');

-- The teacher's memorization history (last saved ayah per student and track) reads only the
-- student's submitted v2 reports, newest first.
create index lesson_reports_v2_student_idx on public.lesson_reports (student_id, submitted_at desc)
  where form_version = 2 and status = 'submitted';

-- submit_report for a v2 report: the structured content and the submit (version, snapshot,
-- audit, lesson outcome) in one transaction. submit_report itself is unchanged; a failure
-- there (version_conflict, lesson_cancelled …) rolls the content back with it.
create function public.submit_report_content(p jsonb) returns jsonb
  language plpgsql set search_path = '' as $$
begin
  update public.lesson_reports
     set content = p -> 'content'
   where id = (p ->> 'report_id')::uuid and form_version = 2;
  if not found then
    raise exception 'form_version_mismatch' using errcode = 'P0001';
  end if;
  return public.submit_report(p - 'content');
end $$;

revoke execute on function public.submit_report_content(jsonb) from public, anon, authenticated;
grant execute on function public.submit_report_content(jsonb) to service_role;
