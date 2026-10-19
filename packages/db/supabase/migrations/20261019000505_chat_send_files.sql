-- Owner 2026-10-19 #2: staff send images/PDFs inside the 24 h window. File in wa-media at
-- out/{actor}/{client_request_id}/{uuid}.{ext} (messages.media_path); the name the family sees in media_name.
-- No bucket or RLS change: wa-media already takes jpeg/png/pdf, a signed upload needs no insert
-- policy (migration 133), and messages_content_check (142) accepts an outbound row with only media_path.
alter table public.messages
  add column media_name text
    check (media_name is null or char_length(btrim(media_name)) between 1 and 200);
