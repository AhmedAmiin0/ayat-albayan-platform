-- Renewal commission, step 1: the columns and the uniqueness swap (owner 2026-10-26: «the assistant takes
-- half of the value on each renewal» = HALF OF HER NORMAL COMMISSION, a setting the admin can change).
-- Expand-only: two columns with constant defaults (metadata only, no table rewrite), so every existing row
-- reads kind 'first', share 100, exactly what it was earned as. No row is rewritten, no commission is
-- backfilled. The one-per-student rule becomes one 'first' row per student; subscription_id stays unique
-- (one row per subscription). The new partial unique index is built BEFORE the old constraint goes, in the
-- same transaction, so the table is never without its one-first-per-student rule. Idempotent.

set local lock_timeout = '5s';

alter table public.assistant_commissions
  add column if not exists kind text not null default 'first',
  add column if not exists share_percent smallint not null default 100;

do $$ begin
  alter table public.assistant_commissions
    add constraint assistant_commissions_kind_check check (kind in ('first', 'renewal'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.assistant_commissions
    add constraint assistant_commissions_share_percent_check check (share_percent between 0 and 100);
exception when duplicate_object then null; end $$;

-- A handful of rows per assistant: a plain (locking) build is instant; CONCURRENTLY cannot run inside the
-- migration's transaction.
create unique index if not exists assistant_commissions_first_uidx
  on public.assistant_commissions (student_id) where kind = 'first';
alter table public.assistant_commissions drop constraint if exists assistant_commissions_student_id_key;
-- The student's rows (the evaluator, attribution, the view): the old constraint's index served this.
create index if not exists assistant_commissions_student_idx on public.assistant_commissions (student_id);

-- The second wall (migration 271): a sales user may read the two new columns of her own rows too.
grant select (kind, share_percent) on public.assistant_commissions to authenticated;

-- «نسبة عمولة التجديد»: the share of her normal commission an assistant earns on each renewal (0..100,
-- default 50). A missing row reads the default; an existing one is never touched.
insert into public.settings (key, value) values ('renewal_commission_percent', '50'::jsonb)
on conflict (key) do nothing;

-- MANUAL ROLLBACK (only before any 'renewal' row exists; after the code rollback):
--   drop index public.assistant_commissions_first_uidx;
--   alter table public.assistant_commissions add constraint assistant_commissions_student_id_key unique (student_id);
--   alter table public.assistant_commissions drop column share_percent, drop column kind;
