-- «المرفقات» of a bank transfer (owner 2026-10-12, docs/11 §7, docs/16 row 25): 0..5 files per payment,
-- OPTIONAL, only when payments.method = 'bank' (the API refuses them otherwise: 400 attachments_not_allowed).
-- The files live in the private `receipts` bucket under the package's folder ({subscription_id}/…, the same
-- upload URL as the receipt); the API checks each path (the package's folder, uploaded, byte-sniffed image /
-- PDF) before it writes the rows. payments.receipt_path is kept as it is (no data change): the API shows it
-- as the first attachment of the older payments.
create table public.payment_attachments (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id) on delete cascade,
  path text not null unique check (path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}$'),
  mime text not null check (mime in ('image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf')),
  size integer check (size > 0),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index payment_attachments_payment_idx on public.payment_attachments (payment_id);

-- The path must sit in the folder of the payment's own package (second wall behind the API's check).
create or replace function public.payment_attachment_in_folder() returns trigger
  language plpgsql set search_path = '' as $$
begin
  if split_part(new.path, '/', 1) <> (select p.subscription_id::text from public.payments p where p.id = new.payment_id) then
    raise exception 'payment attachment % is not in its package folder', new.path using errcode = '23514';
  end if;
  return new;
end $$;
create trigger payment_attachments_folder before insert or update on public.payment_attachments
  for each row execute function public.payment_attachment_in_folder();

-- RLS: the admin reads every row; a salesperson only the files of the payments she recorded (the same rule
-- as payments_sales_own_read, migration 274). Writes: the API (service role) only.
alter table public.payment_attachments enable row level security;
create policy payment_attachments_admin_read on public.payment_attachments for select to authenticated
  using (public.is_admin());
create policy payment_attachments_sales_own_read on public.payment_attachments for select to authenticated
  using (
    public.auth_role() = 'sales'
    and exists (select 1 from public.payments p where p.id = payment_id and p.recorded_by = (select auth.uid()))
  );
revoke all on public.payment_attachments from anon;
revoke insert, update, delete, truncate on public.payment_attachments from authenticated;
revoke all on function public.payment_attachment_in_folder() from public, anon, authenticated;
