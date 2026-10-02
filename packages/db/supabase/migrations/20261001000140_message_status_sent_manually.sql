-- R-MSG-03: an admin sent this outbound row by hand through its wa.me click-to-chat link
-- (POST /messages/:id/sent-manually). The sender never picks a sent_manually row up again.
-- Own file on purpose: a value added to an enum can't be used in the transaction that adds it.
alter type public.message_status add value if not exists 'sent_manually';
