-- R-MEET-02 (review 2026-10-13): a typed phone's display_name is the number itself, or a known
-- guardian's name; only the API reads it (masked for callers outside scope 'all'). No client reads
-- public.meeting_invitees directly, so authenticated loses the column, like phone_e164 (never granted
-- by migration 412; revoked again here so the two stay hidden together). Re-runnable.
revoke select (display_name, phone_e164) on public.meeting_invitees from authenticated;
