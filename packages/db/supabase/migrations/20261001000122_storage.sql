-- Private Storage buckets (R-REP-02/03, R-PAY-01, R-MOB-02; R-NFR-02). Path conventions:
--   reports             {student_id}/{lesson_id}.pdf      rendered by the PDF job (service role)
--   report-attachments  {report_id}/{uuid}.{ext}          teacher uploads through a signed URL
--   receipts            {subscription_id}/{uuid}.{ext}    admin uploads (web or mobile camera)
-- Clients get signed URLs from the API; these policies are defence in depth for direct access.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('reports', 'reports', false, 10485760, array['application/pdf']),
  ('report-attachments', 'report-attachments', false, 26214400,
   array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf',
         'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/webm', 'audio/wav']),
  ('receipts', 'receipts', false, 10485760,
   array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'])
on conflict (id) do nothing;

-- Path helpers compare text, so a malformed object name never makes a policy throw.
create function public.is_my_report_pdf(p_name text) returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.lesson_reports r
    where r.teacher_id = public.my_teacher_id()
      and r.student_id::text = split_part(p_name, '/', 1)
      and r.lesson_id::text || '.pdf' = split_part(p_name, '/', 2))
$$;

create function public.is_my_child_report_pdf(p_name text) returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.lesson_reports r
    where r.status = 'submitted'
      and r.student_id in (select public.my_student_ids())
      and r.student_id::text = split_part(p_name, '/', 1)
      and r.lesson_id::text || '.pdf' = split_part(p_name, '/', 2))
$$;

create function public.report_of_path(p_name text) returns uuid
  language sql stable security definer set search_path = '' as $$
  select r.id from public.lesson_reports r where r.id::text = split_part(p_name, '/', 1)
$$;

create policy storage_phase3_admin on storage.objects for all to authenticated
  using (bucket_id in ('reports', 'report-attachments', 'receipts') and public.is_admin())
  with check (bucket_id in ('reports', 'report-attachments', 'receipts') and public.is_admin());

create policy storage_reports_teacher_read on storage.objects for select to authenticated
  using (bucket_id = 'reports' and public.is_my_report_pdf(name));
create policy storage_reports_guardian_read on storage.objects for select to authenticated
  using (bucket_id = 'reports' and public.is_my_child_report_pdf(name));

-- A teacher reads and adds attachments of own reports; removing one goes through the API.
create policy storage_attachments_teacher_read on storage.objects for select to authenticated
  using (bucket_id = 'report-attachments' and public.is_my_report(public.report_of_path(name)));
create policy storage_attachments_teacher_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'report-attachments' and public.is_my_report(public.report_of_path(name)));
create policy storage_attachments_guardian_read on storage.objects for select to authenticated
  using (bucket_id = 'report-attachments'
         and public.is_my_child_report(public.report_of_path(name)));
