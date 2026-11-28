-- Counts the sticker rows the sticker list answer would refuse (docs/62 Decisions, read-only).
-- count: sticker_messages_total
select count(*) from public.messages where media_mime = 'image/webp';

-- count: sticker_messages_missing_phone
select count(*) from public.messages
where media_mime = 'image/webp' and (phone_e164 is null or phone_e164 = '');

-- count: sticker_favourites_missing_key
select count(*) from public.sticker_favourites where sticker_key is null or sticker_key = '';
