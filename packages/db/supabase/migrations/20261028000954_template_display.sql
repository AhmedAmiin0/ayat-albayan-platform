-- Templates drawn like WhatsApp in the chat (owner 2026-10-28: «not able to see the template like whats app
-- if it have buttons»). message_templates.display keeps what Meta's sync reports the guardian SEES: the
-- header (text, or the kind of media) and every button with its label, link or phone number, call and
-- copy-code buttons too. Display only: the sender keeps reading message_templates.buttons.
-- Shape: { "header": { "type": "text"|"image"|"video"|"document"|"location", "text"?: string } | null,
--          "buttons": [ { "type": "quick_reply"|"url"|"phone_number"|"copy_code", "text": string,
--                         "url"?: string, "phone"?: string } ] }
-- null = not synced since this column (the API falls back to header_format, footer_ar and buttons).
-- Expand-only and idempotent: a nullable column without a default is a catalog-only change. The table
-- keeps its RLS (admins read, only the API writes); no secret is ever stored here.

set local lock_timeout = '5s';

alter table public.message_templates add column if not exists display jsonb null;

comment on column public.message_templates.display is
  'What WhatsApp shows of the template (header, every button) as Meta''s sync last reported it; null = not synced yet. Display only.';
