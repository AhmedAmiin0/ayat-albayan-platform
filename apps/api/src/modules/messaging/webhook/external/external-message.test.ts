import { describe, expect, it } from 'vitest';
import { externalMessage, messageTime, templateParams } from './external-message';
import { kapsoText, SENT_AT, SENT_TS } from './external.fakes';

describe('externalMessage', () => {
  it('reads a Kapso history text: wamid, recipient, WhatsApp time, body, status, direction', () => {
    expect(externalMessage(kapsoText())).toEqual({
      waMessageId: 'wamid.EXT1',
      to: '966501234567',
      at: SENT_AT,
      type: 'text',
      body: 'تم تأكيد الموعد',
      templateName: null,
      templateParams: null,
      mediaId: null,
      mediaMime: null,
      mediaName: null,
      replyTo: null,
      status: 'delivered',
      direction: 'outbound',
    });
  });

  it('reads a template: name and its parameters in messages.template_params shape', () => {
    const components = [
      { type: 'body', parameters: [{ type: 'text', text: 'سلمى' }, { type: 'text', text: 'الأحد 17:00' }] },
      { type: 'button', sub_type: 'quick_reply', index: '0', parameters: [{ type: 'payload', payload: 'confirm:x' }] },
    ];
    const m = externalMessage(kapsoText({ type: 'template', text: undefined, template: { name: 'lesson_reminder_v2', components } }));
    expect(m).toMatchObject({ type: 'template', body: null, templateName: 'lesson_reminder_v2' });
    expect(m?.templateParams).toEqual({ '1': 'سلمى', '2': 'الأحد 17:00', button: 'confirm:x' });
  });

  it('keeps media metadata only (the id, mime, file name), never downloading anything', () => {
    const doc = { id: 'media-9', mime_type: 'application/pdf', filename: 'report.pdf', caption: 'التقرير' };
    const m = externalMessage(kapsoText({ type: 'document', text: undefined, document: doc }));
    expect(m).toMatchObject({ body: 'التقرير', mediaId: 'media-9', mediaMime: 'application/pdf', mediaName: 'report.pdf' });
  });

  it('falls back to kapso.phone_number for the recipient and accepts an ISO timestamp', () => {
    const m = externalMessage(kapsoText({ to: undefined, timestamp: SENT_AT.toISOString(), kapso: { phone_number: '+966501234567' } }));
    expect(m).toMatchObject({ to: '966501234567', at: SENT_AT, status: null, direction: null });
  });

  it('null without an id, a recipient or a readable time', () => {
    expect(externalMessage(kapsoText({ id: undefined }))).toBeNull();
    expect(externalMessage(kapsoText({ to: undefined }))).toBeNull();
    expect(externalMessage(kapsoText({ timestamp: 'soon' }))).toBeNull();
    expect(externalMessage('nope')).toBeNull();
  });
});

describe('messageTime / templateParams', () => {
  it('unix seconds or ISO; never now()', () => {
    expect(messageTime(SENT_TS)).toEqual(SENT_AT);
    expect(messageTime(null)).toBeNull();
    expect(messageTime('0')).toBeNull();
    expect(messageTime(String(SENT_AT.getTime()))).toEqual(SENT_AT);
  });

  it('no parameters → null', () => {
    expect(templateParams([{ type: 'body' }])).toBeNull();
    expect(templateParams('x')).toBeNull();
  });
});
