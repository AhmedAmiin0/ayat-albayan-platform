-- Counts the v_threads rows a chat view answer would refuse (docs/62 Decisions, read-only).
-- count: threads_total
select count(*) from public.v_threads;

-- count: threads_phone_not_e164
select count(*) from public.v_threads
where phone_e164 is null or phone_e164 !~ '^[+][1-9][0-9]{6,14}$';

-- count: threads_missing_last_message
select count(*) from public.v_threads
where last_message_id is null or last_message_at is null
  or last_direction is null or last_status is null;

-- count: threads_negative_unread
select count(*) from public.v_threads where unread_count < 0;

-- count: threads_unknown_line
select count(*) from public.v_threads
where last_inbound_line is not null
  and last_inbound_line::text not in ('chat', 'notifications', 'calls');
