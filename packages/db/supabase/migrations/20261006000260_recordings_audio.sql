-- Recordings are audio only from 2026-10-06 (owner decision: the VPS cannot run a headless Chrome
-- per lesson). LiveKit Egress now writes one mixed MP3 per room and uploads it with the content type
-- audio/mpeg, which migration 189's whitelist (video/mp4 only) would refuse. video/mp4 stays for the
-- older rows and for a rollback.
update storage.buckets
   set allowed_mime_types = array['video/mp4', 'audio/mpeg']
 where id = 'recordings';
