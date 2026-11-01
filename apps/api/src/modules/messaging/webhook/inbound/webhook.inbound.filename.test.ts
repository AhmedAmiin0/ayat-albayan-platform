import { describe, expect, it } from 'vitest';
import type { LineNumbers } from '@/config/env/env';
import { envelope, inboundValue, mediaPart, PHONE_NUMBER_ID } from '@/modules/messaging/webhook/meta.fakes';
import { parseWebhook } from '@/modules/messaging/webhook/parse/webhook.parse';
import { services } from '@/modules/messaging/webhook/webhook.fakes';

// Owner 2026-11-01 («File / File»): a family's document keeps its file name in messages.media_name,
// so the chat's PDF card shows it as WhatsApp does (Meta's document.filename, Kapso's media_data).
const NOW = new Date('2026-10-03T13:05:00Z');
const ONE: LineNumbers = { notifications: PHONE_NUMBER_ID };
const parse = (part: object) =>
  parseWebhook(envelope(inboundValue(part)), { now: NOW, numbers: ONE }).messages;
const pdf = (extra: object) => mediaPart('document', { mime_type: 'application/pdf', ...extra });

describe('an inbound document’s file name', () => {
  it('Meta’s document.filename is stored as media_name', async () => {
    const [m] = parse(pdf({ filename: 'خطة الحفظ.pdf' }));
    expect(m?.mediaName).toBe('خطة الحفظ.pdf');
    const s = services();
    await s.inbound.handle(m ?? expect.fail('no message'));
    expect(s.queries.stored[0]).toMatchObject({ media_mime: 'application/pdf', media_name: 'خطة الحفظ.pdf' });
  });

  it('Kapso’s media_data.filename when the document carries none', () => {
    const [m] = parse({ ...pdf({}), kapso: { media_data: { filename: ' report.pdf ' } } });
    expect(m?.mediaName).toBe('report.pdf');
  });

  it('fits the column: ≤ 200 characters; a blank name or an image stores no media_name at all', async () => {
    expect(parse(pdf({ filename: `${'a'.repeat(300)}.pdf` }))[0]?.mediaName).toHaveLength(200);
    for (const part of [pdf({ filename: '  ' }), mediaPart('image', { filename: 'x.jpg' })]) {
      const [m] = parse(part);
      expect(m).not.toHaveProperty('mediaName');
      const s = services();
      await s.inbound.handle(m ?? expect.fail('no message'));
      expect(s.queries.stored[0]).not.toHaveProperty('media_name');
    }
  });
});
