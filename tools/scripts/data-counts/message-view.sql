-- Counts the messages rows a message view would refuse (docs/62 Decisions, read-only).
-- count: messages_total
select count(*) from public.messages;

-- count: messages_phone_not_e164
select count(*) from public.messages
where phone_e164 !~ '^\+[1-9][0-9]{6,14}$';

-- count: messages_negative_attempts
select count(*) from public.messages
where attempts < 0;

-- count: messages_template_params_not_object
select count(*) from public.messages
where template_params is not null and jsonb_typeof(template_params) <> 'object';
