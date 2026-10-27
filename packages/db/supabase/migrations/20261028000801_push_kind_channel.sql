-- The teacher's bell / push for a new message in a student channel (docs/31 §2). Its own migration: a new
-- enum value cannot be used in the transaction that adds it. Idempotent; expand-only (the previous API
-- never writes it).

alter type public.push_kind add value if not exists 'channel_message';
