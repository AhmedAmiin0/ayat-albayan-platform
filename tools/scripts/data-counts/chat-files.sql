-- Counts the chat file rows the invoice picker's answer would refuse (docs/62 Decisions, read-only).
-- count: chat_media_inbound_total
select count(*) from public.messages
where direction = 'inbound' and media_mime is not null;

-- count: chat_media_missing_created_at
select count(*) from public.messages
where direction = 'inbound' and media_mime is not null and created_at is null;

-- count: chat_media_blank_mime
select count(*) from public.messages
where direction = 'inbound' and media_mime is not null and trim(media_mime) = '';
