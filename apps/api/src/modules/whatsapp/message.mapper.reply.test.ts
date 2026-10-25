import { describe, expect, it } from 'vitest';
import { toMessageView } from './message.mapper';
import { messageRow } from './sender.fakes';

// «رد» / «إعادة توجيه» flags on a MessageView (owner 2026-10-25).

const view = (over: Parameters<typeof messageRow>[0]) =>
  toMessageView({ row: messageRow({ template_key: null, template_params: null, body: 'أهلًا', ...over }), template: null });

describe('toMessageView — reply and forward', () => {
  it('replyable only with a wamid; the link and the forwarded flag come from the row', () => {
    expect(view({ wa_message_id: 'wamid.1' }).replyable).toBe(true);
    expect(view({}).replyable).toBe(false);
    const v = view({ reply_to_message_id: 'q1', forwarded_from_id: 'f1' });
    expect([v.reply_to_message_id, v.reply_to, v.forwarded]).toEqual(['q1', null, true]);
  });

  it('forwardable: a text, our stored file or a viewable inbound file; never a template', () => {
    expect(view({}).forwardable).toBe(true);
    expect(view({ body: null, media_path: 'out/a/b/c.pdf', media_mime: 'application/pdf' }).forwardable).toBe(true);
    expect(view({ body: null, media_path: null, media_mime: 'image/png' }).forwardable).toBe(false);
    expect(view({ direction: 'inbound', body: null, media_id: 'mid', media_mime: 'audio/ogg' }).forwardable).toBe(true);
    expect(view({ direction: 'inbound', body: null, media_id: 'mid', media_mime: 'application/zip' }).forwardable).toBe(false);
    expect(view({ template_key: 'trial_reminder' }).forwardable).toBe(false);
  });
});
