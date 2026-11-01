import { describe, expect, it } from 'vitest';
import { relayCrmBody, relayReadable } from './relay.kinds';
import { relayRequestSchema } from './relay.schema';
import { templateBody, TO } from './relay.fakes';

// Each type → the CrmBody the crm driver posts, and the readable text the chat bubble shows.

const req = (body: unknown) => relayRequestSchema.parse(body);

describe('relay kinds', () => {
  it('template: the CRM name passes through (no platform template), values and buttons as sent', () => {
    expect(relayCrmBody(req(templateBody()))).toEqual({
      to: TO,
      type: 'template',
      name: 'ولي أمر',
      template: {
        name: 'teacher_lesson_reminder',
        language: 'ar',
        params: { body: ['سارة', '17:00'], buttonParams: { '0': 'room-1' } },
      },
    });
    expect(relayReadable(req(templateBody()))).toBe('[teacher_lesson_reminder]\nسارة\n17:00');
  });

  it('text', () => {
    const r = req({ to: TO, type: 'text', text: 'السلام عليكم' });
    expect(relayCrmBody(r)).toEqual({ to: TO, type: 'text', text: 'السلام عليكم' });
    expect(relayReadable(r)).toBe('السلام عليكم');
  });

  it("document: by media_url like the driver's own documents; caption as text", () => {
    const r = req({
      to: TO,
      type: 'document',
      name: 'م',
      document: { link: 'https://drive.example/a', filename: 'r.pdf', caption: 'تقرير الحلقة' },
    });
    expect(relayCrmBody(r)).toEqual({
      to: TO,
      type: 'document',
      media_url: 'https://drive.example/a',
      filename: 'r.pdf',
      text: 'تقرير الحلقة',
      name: 'م',
    });
    expect(relayReadable(r)).toBe('تقرير الحلقة\n📄 r.pdf\nhttps://drive.example/a');
    expect(
      relayCrmBody(req({ to: TO, type: 'document', link: 'https://drive.example/a' })),
    ).toEqual({ to: TO, type: 'document', media_url: 'https://drive.example/a' });
  });
});
