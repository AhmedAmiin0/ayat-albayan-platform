-- Counts the chat receipt rows the sales receipt list schema would refuse (docs/62 Decisions).
-- count: sales_chat_receipts_missing_created_at
select count(*) from public.messages
where direction = 'inbound' and media_mime is not null and created_at is null;

-- count: sales_chat_receipts_blank_mime
select count(*) from public.messages
where direction = 'inbound' and media_mime is not null and btrim(media_mime) = '';
