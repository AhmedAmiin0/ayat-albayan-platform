-- Online classrooms (LiveKit), step 1: the teaching-assistant login. A new enum value is not
-- usable inside the transaction that adds it, so it sits alone; migration 181 builds on it.
-- The access-token hook reads profiles.role as is, so an assistant's token carries
-- user_role = 'assistant' with no change to the hook; admin, teacher and guardian flows are untouched.
alter type public.user_role add value if not exists 'assistant';
