-- Chat PDF preview (owner 2026-10-29: «preview pdf like WhatsApp in the chat»): what pdfinfo said about a
-- message's PDF, so the bubble's «12 صفحة · PDF · 1.2 ميغابايت» and the viewer's page list never run it again.
--   media_pages: null = not probed yet; 0 = no preview (encrypted, broken, too big: never probed again);
--                n = the page count (the API clamps a crafted count before storing it).
--   media_bytes: the PDF's size in bytes.
-- The page images live in the existing wa-media bucket under pdf/{message_id}/{page}.jpg (image/jpeg is
-- already allowed there, migrations 170 and 500): no bucket, policy or grant change. Read and written only
-- by the API (service role) in inbox/files/pdf/pdf-preview.queries.ts, never through InboundMediaQueries'
-- shared select, so a deploy without this migration breaks only the preview. The columns inherit the RLS
-- of public.messages. The first write fires messages_inbox_live_update once per PDF, as setting media_path does.
-- Idempotent and expand-only: the previous API never reads or writes these columns.
-- MANUAL ROLLBACK (after the code rollback):
--   alter table public.messages drop column if exists media_pages, drop column if exists media_bytes;

set local lock_timeout = '5s';

alter table public.messages
  add column if not exists media_pages integer check (media_pages is null or media_pages >= 0),
  add column if not exists media_bytes integer check (media_bytes is null or media_bytes >= 0);
