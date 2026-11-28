import { describe, expect, it } from 'vitest';
import { templateViewSchema } from '..';
import { aTemplateView } from '../../../../testing/messaging/templates';

const parses = (v: unknown) => templateViewSchema.safeParse(v).success;

describe('templateViewSchema', () => {
  it('reads a full row and one from an older api without the optional parts', () => {
    const full = aTemplateView();
    const { display, numbers, number_id, crm_name, crm_language, ...rest } = full;
    const { created_by, approved_edits, ...old } = rest;
    expect(templateViewSchema.parse(full)).toEqual(full);
    expect(templateViewSchema.parse(old)).toEqual(old);
  });

  it('reads a url button and a row never synced', () => {
    const url = { type: 'url', url: 'https://meet.test/{{1}}', example: 'https://meet.test/abc' };
    const row = aTemplateView({ buttons: [url] as never, display: null, status: 'not_submitted' });
    expect(parses(row)).toBe(true);
  });

  it('refuses an unknown status, category, line or header', () => {
    const bad = [
      aTemplateView({ status: 'live' as never }),
      aTemplateView({ category: 'sales' as never }),
      aTemplateView({ line: 'sales' as never }),
      aTemplateView({ header_format: 'image' as never }),
    ];
    expect(bad.filter(parses)).toEqual([]);
  });

  it('refuses a time without its offset and a quick reply without its intent', () => {
    const bad = [
      aTemplateView({ last_checked_at: '2026-11-27 10:00' }),
      aTemplateView({ buttons: [{ type: 'quick_reply', text: 'x' }] as never }),
    ];
    expect(bad.filter(parses)).toEqual([]);
  });
});
