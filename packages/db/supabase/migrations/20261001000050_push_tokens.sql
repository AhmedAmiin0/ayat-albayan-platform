-- Expo push tokens per admin device (R-MOB-01). Written only by the API (service role) through
-- PUT/DELETE /me/push-tokens; the existing profiles RLS (self read, admin write) is unchanged.
-- Sending pushes comes later (TODO(R-MOB-01) per event in Phases 2-4).
alter table public.profiles add column push_tokens text[] not null default '{}';
