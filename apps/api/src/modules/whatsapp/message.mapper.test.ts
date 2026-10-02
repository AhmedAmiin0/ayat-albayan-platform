import { describe, expect, it } from 'vitest';
import { needsManualSend, toMessageView } from './message.mapper';
import { messageRow } from './sender.fakes';
import { renderable, toTemplateView } from './template.mapper';
import { REPORT_READY, templateRow } from './whatsapp.fakes';

const booking = renderable(templateRow());

describe('toMessageView (R-MSG-05, R-MSG-03)', () => {
  it('a queued template row shows its rendered text and a wa.me link with the same text and the meeting link', () => {
    const view = toMessageView({ row: messageRow(), template: booking });
    expect(view.body).toBe('تم حجز حلقة سلمى — الأحد 4 أكتوبر 17:00');
    expect(view.template_params).toEqual({ '1': 'سلمى', '2': 'الأحد 4 أكتوبر 17:00', button: 'ab-sara-x1' });
    const text = 'تم حجز حلقة سلمى — الأحد 4 أكتوبر 17:00\n\nhttps://meet.jit.si/ab-sara-x1\n\nأكاديمية آيات البيان';
    expect(view.click_to_chat).toBe(`https://wa.me/966551234567?text=${encodeURIComponent(text)}`);
  });

  it('a failed report row puts the signed PDF link in the fallback text', () => {
    const row = messageRow({ status: 'failed', template_key: 'report_ready', template_params: { '1': 'سلمى', '2': 'الثلاثاء' } });
    const view = toMessageView({ row, template: renderable(REPORT_READY), documentUrl: 'https://storage.local/r.pdf' });
    expect(decodeURIComponent(view.click_to_chat ?? '')).toContain('https://storage.local/r.pdf');
  });

  it('sent, sent by hand and inbound rows carry no wa.me link', () => {
    for (const row of [
      messageRow({ status: 'sent' }),
      messageRow({ status: 'sent_manually', sent_manually_at: '2026-10-02T09:00:00Z' }),
      messageRow({ direction: 'inbound', status: 'delivered', template_key: null, template_params: null, body: 'سلام' }),
    ]) {
      expect(toMessageView({ row, template: null }).click_to_chat).toBeNull();
    }
  });

  it('a row the sender has claimed (queued, «sending» under its lease) offers no wa.me link', () => {
    const claimed = messageRow({ status: 'queued', attempts: 1, error_code: 'sending', next_attempt_at: '2026-10-02T08:02:00Z' });
    expect(needsManualSend(claimed)).toBe(false);
    expect(toMessageView({ row: claimed, template: booking }).click_to_chat).toBeNull();
    // the claim resolved: back in the queue after a retryable error, or failed → offered again
    expect(needsManualSend({ ...claimed, error_code: '130429' })).toBe(true);
    expect(needsManualSend({ ...claimed, status: 'failed', error_code: 'uncertain' })).toBe(true);
  });

  it('a queued session text links its own text; stored body wins over the template; media url passes through', () => {
    const text = messageRow({ template_key: null, template_params: null, body: 'وعليكم السلام' });
    const view = toMessageView({ row: text, template: null, mediaUrl: 'https://s/m.ogg' });
    expect(view.body).toBe('وعليكم السلام');
    expect(view.template_params).toBeNull();
    expect(view.media_url).toBe('https://s/m.ogg');
    expect(view.click_to_chat).toBe(`https://wa.me/966551234567?text=${encodeURIComponent('وعليكم السلام')}`);
  });
});

describe('toTemplateView', () => {
  it('parses params and buttons from jsonb; anything but document is no header', () => {
    expect(toTemplateView(REPORT_READY)).toMatchObject({ key: 'report_ready', header_format: 'document', params: ['student_name', 'lesson_when'], buttons: [] });
    const odd = toTemplateView(templateRow({ header_format: 'image', params: 'oops', buttons: [{ type: 'phone' }] }));
    expect(odd).toMatchObject({ header_format: null, params: [], buttons: [] });
  });

  it('carries the lesson as it is now (thread rows embed it), else null', () => {
    const lesson = { starts_at: '2026-10-04T14:00:00+00:00', status: 'confirmed' as const };
    expect(toMessageView({ row: { ...messageRow(), lesson }, template: booking }).lesson).toEqual(lesson);
    expect(toMessageView({ row: messageRow(), template: booking }).lesson).toBeNull();
  });
});
