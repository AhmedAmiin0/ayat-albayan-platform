-- Owner 2026-10-19 #1: voice notes and videos families send play in the chat. wa-media takes WhatsApp's
-- audio/video types up to 16 MiB; images/PDFs keep their 10 MB cap in the API (chatFileMaxBytes).
update storage.buckets
   set file_size_limit = 16777216,
       allowed_mime_types = array[
         'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf',
         'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/amr', 'video/mp4', 'video/3gpp']
 where id = 'wa-media';
-- The daily WaMediaRetentionJob (owner answer #2): cached INBOUND files older than 30 days. The job
-- purges audio/video only; photos and PDFs are kept. The index serves its oldest-first scan.
create index if not exists messages_media_cached_idx
  on public.messages (created_at) where media_path is not null and direction = 'inbound';
-- No policy change: storage_invoices_admin (migration 170) stays admin-only; the API uses the
-- service role and hands out signed URLs.
