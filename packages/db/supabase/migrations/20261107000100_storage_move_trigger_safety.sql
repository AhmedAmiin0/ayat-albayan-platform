-- A stored file moving to MinIO never moves money or wakes the inbox (owner rule: money outcomes are
-- per-case choices, never side effects; docs/45 §6). storage-move rewrites a path to «minio:<key>» (the
-- same key, verified byte for byte) on 13 columns; the audit of every trigger on those tables is in the
-- PR and docs/45 §6. Three of them did more than set updated_at on such a path-only update:
--   1. payments_assistant_commission_trg (272) ran evaluate_assistant_commission on EVERY update, so a
--      receipt rewrite (or a note edit) re-applied today's rules (first / renewal, started course,
--      renewal switch and cutoff) and could create, settle or exclude a commission. It now runs on an
--      update only when a column the evaluation reads changes: payments.subscription_id, amount, kind,
--      paid_at, created_at, id (subscription_full_at's running net and its order; evaluate /
--      settle_assistant_commission / assistant_commission_plan read nothing else of payments). INSERT
--      and DELETE are unchanged, and so is every money update (same function, same order).
--   2. payments_frozen_when_cancelled (934 / 991) refused ANY update of a cancelled package's payment, so
--      its receipt could never be moved. Its intent (934: «a cancelled package is never paid into …
--      its payments are frozen») is the money: it now lets through exactly one change, the receipt
--      relocated to the same key in MinIO (old path unmarked, new = 'minio:' || old) or its runbook
--      rollback (the exact inverse), with every other column equal. Amount, kind, dates, package,
--      method, a different receipt and a delete are refused exactly as before.
--   3. messages_inbox_live_update (860) broadcast 'thread_changed' for every updated message. It now
--      skips a row whose only change is media_path relocated to MinIO or back (a first media_path, null → path,
--      still broadcasts: the media just arrived). updated_at still moves (the sync cursor re-sends the
--      row with its new path, as wanted).
-- Deploy: function bodies and triggers only; no row is read, evaluated or changed.
-- SQL test plan: e2e/tests/finance/payments-path-only.sql.spec.ts,
--   e2e/tests/finance/payments-frozen-receipt.sql.spec.ts, e2e/tests/messaging/inbox-media-moved.sql.spec.ts.
-- Rollback: re-run 272's trigger (after insert or update or delete, no when), drop trigger
--   payments_assistant_commission_upd; re-run 991's payments_frozen_when_cancelled; re-run 860's
--   messages_inbox_live_update; drop functions storage_relocated, only_path_moved,
--   inbox_broadcast_updated.
set local lock_timeout = '5s';

-- The storage-move rewrite and nothing else: an unmarked path gaining the «minio:» marker.
create or replace function public.storage_relocated(p_old text, p_new text) returns boolean
  language sql immutable set search_path = '' as $$
  select coalesce(p_old not like 'minio:%' and p_new = 'minio:' || p_old, false)
$$;

-- Two versions of one row (to_jsonb) differ only by p_column relocated to MinIO, or moved back by the
-- docs/45 §6 rollback (updated_at aside).
create or replace function public.only_path_moved(p_old jsonb, p_new jsonb, p_column text)
  returns boolean language sql immutable set search_path = '' as $$
  select coalesce((public.storage_relocated(p_old ->> p_column, p_new ->> p_column)
                   or public.storage_relocated(p_new ->> p_column, p_old ->> p_column))
    and (p_old - p_column - 'updated_at') = (p_new - p_column - 'updated_at'), false)
$$;
-- Both stay executable by every role: pure functions of their arguments (no table read), and the
-- payments guard runs as the caller.

-- 1. Commission: INSERT / DELETE as in 272; an UPDATE only when what the evaluation reads changes.
drop trigger if exists payments_assistant_commission_trg on public.payments;
create trigger payments_assistant_commission_trg after insert or delete on public.payments
  for each row execute function public.payments_assistant_commission();
drop trigger if exists payments_assistant_commission_upd on public.payments;
create trigger payments_assistant_commission_upd after update on public.payments
  for each row when (
    (old.subscription_id, old.amount, old.kind, old.paid_at, old.created_at, old.id)
      is distinct from (new.subscription_id, new.amount, new.kind, new.paid_at, new.created_at, new.id))
  execute function public.payments_assistant_commission();

-- 2. 991's guard; the receipt's relocation to MinIO is the one update it lets through.
create or replace function public.payments_frozen_when_cancelled() returns trigger
  language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and public.only_path_moved(to_jsonb(old), to_jsonb(new), 'receipt_path') then
    return new; -- the same file, now served from MinIO: no money column changed
  end if;
  if exists (select 1 from public.subscriptions s where s.id = old.subscription_id and s.status = 'cancelled'
                and s.cancel_kind is distinct from 'stopped') then
    raise exception 'subscription % is cancelled', old.subscription_id using errcode = '23514';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
revoke all on function public.payments_frozen_when_cancelled() from public, anon, authenticated;

-- 3. 860's broadcast on update, without the rows whose only change is the media relocated to MinIO.
create or replace function public.inbox_broadcast_updated() returns trigger
  language plpgsql security definer set search_path = '' as $$
declare
  v_phones text[];
begin
  begin
    select array_agg(d.phone) into v_phones from (
      select distinct c.phone_e164::text as phone
        from changed c join old_rows o on o.id = c.id
       where c.phone_e164 is not null and not public.only_path_moved(to_jsonb(o), to_jsonb(c), 'media_path')
       limit 200
    ) d;
    if v_phones is not null then
      perform public.inbox_live_send(v_phones);
    end if;
  exception when others then
    raise warning 'inbox_broadcast_updated: % (%)', sqlerrm, sqlstate;
  end;
  return null;
end $$;
revoke all on function public.inbox_broadcast_updated() from public, anon, authenticated;

drop trigger if exists messages_inbox_live_update on public.messages;
create trigger messages_inbox_live_update after update on public.messages
  referencing old table as old_rows new table as changed
  for each statement execute function public.inbox_broadcast_updated();
