-- Counts the wa_calls rows the call view answers would refuse (docs/62 Decisions, read-only).
-- count: calls_total
select count(*) from public.wa_calls;

-- count: calls_phone_not_e164
select count(*) from public.wa_calls where phone_e164 !~ '^[+][1-9][0-9]{7,14}$';

-- count: calls_unknown_enum
select count(*) from public.wa_calls
where direction not in ('outbound', 'inbound')
  or status not in ('connecting', 'ringing', 'accepting', 'active', 'ended')
  or end_reason not in (
    'completed', 'no_answer', 'rejected', 'cancelled', 'missed', 'declined', 'failed'
  );

-- count: calls_negative_duration
select count(*) from public.wa_calls where duration_seconds < 0;
