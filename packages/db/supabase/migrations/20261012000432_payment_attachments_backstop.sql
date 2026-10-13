-- «المرفقات» backstop (owner 2026-10-12, docs/11 §7): the API's rules on payment_attachments held by the
-- database too, so a race or a direct write cannot break them.
--   1. files only on a bank transfer (the API: 400 attachments_not_allowed);
--   2. at most 5 files per payment (PAYMENT_ATTACHMENTS_MAX). Only the OTHER rows count (path <> new.path),
--      so an identical replay of a full form still reaches ON CONFLICT (path) DO NOTHING and is ignored;
--   3. a payment with files cannot leave 'bank' (the API: 400 attachments_not_allowed on PATCH).
-- The payment row is locked (for update) before counting, so two concurrent saves on one payment queue up.
create or replace function public.payment_attachment_rules() returns trigger
  language plpgsql set search_path = '' as $$
declare
  pay_method text;
begin
  select p.method::text into pay_method from public.payments p where p.id = new.payment_id for update;
  if pay_method is distinct from 'bank' then
    raise exception 'payment attachments only on a bank transfer (payment %)', new.payment_id using errcode = '23514';
  end if;
  if (select count(*) from public.payment_attachments a where a.payment_id = new.payment_id and a.path <> new.path) >= 5 then
    raise exception 'payment attachments: at most 5 per payment (payment %)', new.payment_id using errcode = '23514';
  end if;
  return new;
end $$;
create trigger payment_attachments_rules before insert on public.payment_attachments
  for each row execute function public.payment_attachment_rules();

create or replace function public.payment_keeps_bank_with_attachments() returns trigger
  language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from public.payment_attachments a where a.payment_id = new.id) then
    raise exception 'payment % has attachments: it stays a bank transfer', new.id using errcode = '23514';
  end if;
  return new;
end $$;
create trigger payments_keep_bank_with_attachments before update of method on public.payments
  for each row when (old.method = 'bank' and new.method is distinct from 'bank')
  execute function public.payment_keeps_bank_with_attachments();

revoke all on function public.payment_attachment_rules() from public, anon, authenticated;
revoke all on function public.payment_keeps_bank_with_attachments() from public, anon, authenticated;
