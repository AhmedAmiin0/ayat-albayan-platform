-- Every new message linked to its number in legacy mode (owner 2026-10-25, docs/23c «ربط كل رسالة برقمها»).
-- While settings.comms_source = 'legacy' (or unset) the app stamps only messages.line; number_id stayed null.
-- This BEFORE trigger fills number_id from the line: the ONE enabled wa_numbers row whose purpose = line,
-- else null (none, or more than one: ambiguous). It covers every writer (webhooks meta / kapso / wacrm, the
-- sender's claim, the CRM driver, inbox send, reminders, imports) without touching their code, so the rows
-- the app writes and every send, routing, reply-window, gate and template decision stay byte for byte as
-- today (under legacy nothing reads number_id). It never overrides a number the writer set, does nothing in
-- module mode (the app stamps there, docs/23c decisions 5–8), and never touches existing rows. It reads
-- public.settings and never writes it. Idempotent: safe to run twice.

set local lock_timeout = '5s';

-- The one enabled number of a line (null: no line, none, or more than one).
create or replace function public.messages_line_number(p_line public.wa_line) returns uuid
  language sql stable security definer set search_path = public, pg_temp as $$
  select case when count(*) = 1 then (array_agg(n.id))[1] end
    from public.wa_numbers n where n.enabled and n.purpose = p_line;
$$;
revoke all on function public.messages_line_number(public.wa_line) from public, anon, authenticated;

create or replace function public.messages_link_number() returns trigger
  language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if coalesce((select s.value #>> '{}' from public.settings s where s.key = 'comms_source'), 'legacy') <> 'legacy' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.number_id is null then
      new.number_id := public.messages_line_number(new.line);
    end if;
    return new;
  end if;
  -- Update of line: only a number this trigger would have chosen follows the line; a number the writer set
  -- (or a hand-stamped history row) is kept.
  if new.number_id is not distinct from old.number_id
     and (old.number_id is null or old.number_id is not distinct from public.messages_line_number(old.line)) then
    new.number_id := public.messages_line_number(new.line);
  end if;
  return new;
end $$;
revoke all on function public.messages_link_number() from public, anon, authenticated;

-- Insert: a row without a number. Update: the legacy claim re-stamps line (two lines in use), so the number
-- follows the new line.
drop trigger if exists messages_link_number_ins on public.messages;
create trigger messages_link_number_ins before insert on public.messages
  for each row when (new.number_id is null)
  execute function public.messages_link_number();
drop trigger if exists messages_link_number_upd on public.messages;
create trigger messages_link_number_upd before update of line on public.messages
  for each row when (new.line is distinct from old.line)
  execute function public.messages_link_number();

-- MANUAL ROLLBACK:
--   drop trigger if exists messages_link_number_ins on public.messages;
--   drop trigger if exists messages_link_number_upd on public.messages;
--   drop function if exists public.messages_link_number();
