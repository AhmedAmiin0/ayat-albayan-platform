import { describe, expect, it } from 'vitest';
import { relayRequestSchema } from './relay.schema';
import { templateBody, TO } from './relay.fakes';

// The script's three bodies at the boundary (rule 12): one per type, unknown keys stripped.

const parse = (body: unknown) => relayRequestSchema.safeParse(body);

describe('relayRequestSchema', () => {
  it('template: `to` with or without «+» becomes E.164; the CRM name and values pass through; extras stripped', () => {
    for (const to of ['966500000001', '+966500000001']) {
      const r = parse({ ...templateBody(to), contentType: 'x', extra: 1 });
      expect(r.success && r.data).toEqual({
        to: TO,
        type: 'template',
        name: 'ولي أمر',
        template: {
          name: 'teacher_lesson_reminder',
          language: 'ar',
          params: { body: ['سارة', '17:00'], buttonParams: { '0': 'room-1' } },
        },
      });
    }
  });

  it('template without params gets {}', () => {
    const r = parse({ to: TO, type: 'template', template: { name: 'x', language: 'ar' } });
    expect(r.success && r.data.type === 'template' && r.data.template.params).toEqual({});
  });

  it('text needs a non-empty text', () => {
    expect(parse({ to: TO, type: 'text', text: 'السلام عليكم', name: 'م' }).success).toBe(true);
    expect(parse({ to: TO, type: 'text', text: '  ' }).success).toBe(false);
  });

  it('document: document.link wins over link / media_url / url; caption and filename from document first', () => {
    const r = parse({
      to: TO,
      type: 'document',
      text: 'نص',
      media_url: 'https://drive.example/b',
      url: 'https://drive.example/c',
      link: 'https://drive.example/d',
      filename: 'old.pdf',
      document: {
        link: 'https://drive.example/a',
        filename: 'report.pdf',
        caption: 'تقرير الحلقة',
      },
    });
    expect(r.success && r.data).toEqual({
      to: TO,
      type: 'document',
      name: undefined,
      link: 'https://drive.example/a',
      caption: 'تقرير الحلقة',
      filename: 'report.pdf',
    });
  });

  it('document: a top-level link alone is enough; no link at all is refused', () => {
    const r = parse({ to: TO, type: 'document', url: 'https://drive.example/c', caption: 'c' });
    expect(r.success && r.data.type === 'document' && r.data.link).toBe('https://drive.example/c');
    expect(parse({ to: TO, type: 'document', caption: 'c' }).success).toBe(false);
    expect(parse({ to: TO, type: 'document', link: 'javascript:alert(1)' }).success).toBe(false);
  });

  it('refuses an unknown type, a bad phone and a missing template name', () => {
    expect(parse({ to: TO, type: 'image', link: 'https://x.example' }).success).toBe(false);
    expect(parse({ to: 'abc', type: 'text', text: 'x' }).success).toBe(false);
    expect(parse({ to: '0500', type: 'text', text: 'x' }).success).toBe(false);
    expect(parse({ to: TO, type: 'template', template: { language: 'ar' } }).success).toBe(false);
  });
});
