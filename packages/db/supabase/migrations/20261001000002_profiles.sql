-- auth.users <-> profiles(role). R-AUTH-01, R-NFR-02.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null,
  full_name text not null,
  phone_e164 public.e164 unique,
  locale text not null default 'ar',
  tz text not null default 'Asia/Riyadh',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Role of the calling user; security definer so RLS policies can use it without recursion.
create function public.auth_role() returns public.user_role
  language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid()
$$;

create function public.is_admin() returns boolean
  language sql stable security definer set search_path = '' as $$
  select coalesce(public.auth_role() = 'admin', false)
$$;

alter table public.profiles enable row level security;
create policy profiles_self_read on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());
create policy profiles_admin_write on public.profiles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
