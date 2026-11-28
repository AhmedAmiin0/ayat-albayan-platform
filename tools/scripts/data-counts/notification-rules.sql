-- Counts the rows the notification catalogue view would refuse (docs/62 Decisions, read-only).
-- count: line_health_total
select count(*) from public.wa_line_health;

-- count: line_health_unknown_line_or_no_check
select count(*) from public.wa_line_health
where line::text not in ('notifications', 'chat') or checked_at is null;

-- count: notification_rules_unknown_channel
select count(*) from public.notification_rules
where channels is not null and not (channels <@ array['whatsapp', 'bell', 'push']);
