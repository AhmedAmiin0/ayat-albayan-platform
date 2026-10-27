-- Family accounts (owner 2026-10-27, docs/30): guardians sign in with phone + WhatsApp code, child students
-- with students.code + password, teachers with a username the admin picks; forgot password for everyone.
--
-- 1. students.contact_is_self: «رقم الواتساب لـ: الطالب نفسه» (docs/13 deviation). Wording only.
-- 2. profiles.username: a teacher's sign-in name (lower-case, unique). Students use students.code instead.
-- 3. login_codes: one row per code sent; only an HMAC of the code is kept (the pepper is an API secret).
--    API-only (service role): RLS on with no policy, no grant to anon / authenticated.
-- 4. login_code_take / login_code_spend: the attempt counter and the single use, race-free in SQL.
-- 5. admin_list_users: + username; a family login's synthetic email (@family.invalid) is never shown.
--
-- Expand-only: the previous API / web / mobile ignore every new column and table.

set local lock_timeout = '5s';

alter table public.students add column if not exists contact_is_self boolean not null default false;
comment on column public.students.contact_is_self is
  'The guardian row''s WhatsApp is the student''s own (an adult student): wording only («حسابي»), docs/30.';

alter table public.profiles add column if not exists username text;
alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format
  check (username is null or username ~ '^[a-z0-9._-]{3,30}$');
create unique index if not exists profiles_username_key on public.profiles (username) where username is not null;
comment on column public.profiles.username is
  'Sign-in name a teacher may use instead of the email (docs/30): lower-case, picked by the admin.';

create table if not exists public.login_codes (
  id uuid primary key default gen_random_uuid(),
  purpose text not null check (purpose in ('sign_in', 'reset_password', 'set_password')),
  -- guardian = guardians.id, student = students.id, profile = profiles.id (staff).
  subject_kind text not null check (subject_kind in ('guardian', 'student', 'profile')),
  subject_id uuid not null,
  -- The phone ON FILE the code went to (never a number the caller typed).
  phone_e164 public.e164 not null,
  code_hash text not null check (char_length(code_hash) = 64),
  attempts smallint not null default 0 check (attempts >= 0),
  max_attempts smallint not null check (max_attempts between 1 and 20),
  expires_at timestamptz not null,
  used_at timestamptz,
  sent_at timestamptz,
  -- A short code (WaError code or ours), never a phone number or a payload.
  send_error text check (char_length(send_error) <= 100),
  created_at timestamptz not null default now()
);
create index if not exists login_codes_phone_idx on public.login_codes (phone_e164, created_at desc);
create index if not exists login_codes_subject_idx on public.login_codes (subject_kind, subject_id, created_at desc);
alter table public.login_codes enable row level security;
revoke all on table public.login_codes from anon, authenticated;
comment on table public.login_codes is
  'WhatsApp sign-in / password codes (docs/30 §3): HMAC only, single use, API (service role) only.';

-- One attempt on a live code: counts it first, then hands the hash to the API's constant-time compare.
-- null = no such live code (expired, spent, out of attempts).
create or replace function public.login_code_take(p_id uuid) returns text
  language sql security definer set search_path = '' as $$
  update public.login_codes set attempts = attempts + 1
  where id = p_id and used_at is null and expires_at > now() and attempts < max_attempts
  returning code_hash
$$;

-- Spends a code once: true for the first caller only.
create or replace function public.login_code_spend(p_id uuid) returns boolean
  language sql security definer set search_path = '' as $$
  with spent as (
    update public.login_codes set used_at = now() where id = p_id and used_at is null returning 1
  )
  select exists (select 1 from spent)
$$;

revoke all on function public.login_code_take(uuid) from public, anon, authenticated;
revoke all on function public.login_code_spend(uuid) from public, anon, authenticated;
grant execute on function public.login_code_take(uuid) to service_role;
grant execute on function public.login_code_spend(uuid) to service_role;

-- The users directory (migration 283) + username; family logins' synthetic emails stay hidden.
drop function if exists public.admin_list_users(text, public.user_role, text, int, int);
create function public.admin_list_users(
  q text default null, role public.user_role default null, status text default null,
  lim int default 25, off int default 0
) returns table (
  id uuid, email text, full_name text, phone_e164 text, role public.user_role, role_id uuid,
  role_key text, disabled_at timestamptz, last_sign_in_at timestamptz, banned_until timestamptz,
  created_at timestamptz, linked_kind text, linked_id uuid, linked_name text, linked_code text,
  total bigint, username text
) language sql stable security definer set search_path = '' as $$
  with base as (
    select p.id,
      case when u.email::text ilike '%@family.invalid' then null else u.email::text end as email,
      p.full_name, p.phone_e164::text as phone_e164, p.role, p.role_id,
      coalesce(r.key, sr.key) as role_key, p.disabled_at, u.last_sign_in_at, u.banned_until,
      p.created_at, l.kind as linked_kind, l.id as linked_id, l.name as linked_name, l.code as linked_code,
      p.username
    from public.profiles p
    join auth.users u on u.id = p.id
    left join public.roles r on r.id = p.role_id
    left join public.roles sr on sr.is_system and sr.base_role = p.role
    left join lateral (
      select 'teacher'::text as kind, t.id, t.display_name_ar as name, null::text as code
        from public.teachers t where t.profile_id = p.id
      union all
      select 'student', s.id, s.name, s.code from public.students s where s.profile_id = p.id
      union all
      select 'guardian', g.id, g.name, null from public.guardians g where g.profile_id = p.id
      limit 1
    ) l on true
    where (admin_list_users.role is null or p.role = admin_list_users.role)
      and (coalesce(admin_list_users.status, '') not in ('active', 'disabled')
        or (admin_list_users.status = 'disabled') = (p.disabled_at is not null))
      and (nullif(btrim(admin_list_users.q), '') is null
        or p.full_name ilike '%' || btrim(admin_list_users.q) || '%'
        or (u.email ilike '%' || btrim(admin_list_users.q) || '%' and u.email::text not ilike '%@family.invalid')
        or p.phone_e164::text like '%' || btrim(admin_list_users.q) || '%'
        or p.username ilike '%' || btrim(admin_list_users.q) || '%'
        or l.code ilike '%' || btrim(admin_list_users.q) || '%')
  )
  select b.id, b.email, b.full_name, b.phone_e164, b.role, b.role_id, b.role_key, b.disabled_at,
    b.last_sign_in_at, b.banned_until, b.created_at, b.linked_kind, b.linked_id, b.linked_name,
    b.linked_code, count(*) over () as total, b.username
  from base b
  order by b.created_at desc, b.id
  limit greatest(1, least(coalesce(admin_list_users.lim, 25), 200))
  offset greatest(0, coalesce(admin_list_users.off, 0))
$$;

revoke all on function public.admin_list_users(text, public.user_role, text, int, int) from public, anon, authenticated;
grant execute on function public.admin_list_users(text, public.user_role, text, int, int) to service_role;

-- MANUAL ROLLBACK (only after the code rollback):
--   re-run migration 20261006000283 (admin_list_users without username);
--   drop function public.login_code_take(uuid); drop function public.login_code_spend(uuid);
--   drop table public.login_codes;
--   alter table public.profiles drop column username;  -- loses the teachers' usernames
--   alter table public.students drop column contact_is_self;
