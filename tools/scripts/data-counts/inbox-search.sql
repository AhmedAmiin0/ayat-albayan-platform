-- Counts the message rows the inbox search answers would refuse (docs/62 Decisions, read-only).
-- count: messages_total
select count(*) from public.messages;

-- count: messages_phone_not_e164
select count(*) from public.messages where phone_e164 !~ '^[+][1-9][0-9]{7,14}$';

-- count: messages_missing_time
select count(*) from public.messages where created_at is null;
