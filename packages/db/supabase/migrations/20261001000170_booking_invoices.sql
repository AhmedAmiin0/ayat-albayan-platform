-- Booking kind (trial | package | makeup) and the invoice proof of a non-trial booking
-- (R-SCH-10 حجز تعويضي, R-PAY-03 فاتورة, R-MSG-06 save a WhatsApp image/PDF as a file).
--   * lessons.makeup_of_id links a replacement lesson to the missed one; at most one ACTIVE
--     makeup per missed lesson (partial unique index). A one-lesson move keeps the tag (trigger).
--   * invoices: one image/PDF per booking (rule), private bucket `invoices`; admin-only (RLS).
--   * wa-media: cache of inbound WhatsApp media downloaded on demand (service role / admin).
-- SQL test plan (local DB, begin … rollback): see migrations 171 and 172.

create type public.booking_kind as enum ('trial', 'package', 'makeup');

alter table public.lessons
  add column makeup_of_id uuid references public.lessons (id) on delete set null;
create unique index lessons_makeup_of_key on public.lessons (makeup_of_id)
  where makeup_of_id is not null
    and status not in ('cancelled_by_teacher', 'cancelled_by_admin', 'rescheduled');

-- apply_lesson_changes v2 marks the old lesson `rescheduled` before it inserts the replacement,
-- so the index never sees two active rows; the replacement inherits the tag here.
create function public.lessons_makeup_inherit() returns trigger
  language plpgsql set search_path = '' as $$
begin
  if new.rescheduled_from_id is not null and new.makeup_of_id is null then
    select l.makeup_of_id into new.makeup_of_id from public.lessons l
      where l.id = new.rescheduled_from_id;
  end if;
  return new;
end $$;
create trigger lessons_makeup_inherit before insert on public.lessons
  for each row execute function public.lessons_makeup_inherit();

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid references public.schedule_rules (id) on delete set null,
  kind public.booking_kind not null check (kind <> 'trial'),
  storage_path text not null unique,
  mime text not null,
  size_bytes int not null check (size_bytes > 0),
  source text not null check (source in ('upload', 'whatsapp')),
  message_id uuid references public.messages (id) on delete set null,
  client_request_id uuid not null unique,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id)
);
create index invoices_rule_idx on public.invoices (rule_id);
alter table public.invoices enable row level security;
-- No teacher or guardian policy: a teacher never sees invoices (payments are admin-only too).
create policy invoices_admin on public.invoices for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('invoices', 'invoices', false, 10485760,
   array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']),
  ('wa-media', 'wa-media', false, 10485760,
   array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'])
on conflict (id) do nothing;
create policy storage_invoices_admin on storage.objects for all to authenticated
  using (bucket_id in ('invoices', 'wa-media') and public.is_admin())
  with check (bucket_id in ('invoices', 'wa-media') and public.is_admin());
