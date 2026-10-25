import { describe, expect, it } from 'vitest';
import { footerLabel, footerTemplate, pageCount } from './pdf-pages';

const pdf = (body: string) => new TextEncoder().encode(body);

describe('pdf-pages (R-REP-03: a report past one page keeps its identity on every page)', () => {
  it('counts page objects, not the /Pages tree', () => {
    expect(pageCount(pdf('<< /Type /Pages /Kids [] >> << /Type /Page >> << /Type/Page >>'))).toBe(2);
    expect(pageCount(pdf('%PDF-1.4'))).toBe(0);
  });

  it('the footer label is the code and the lesson date in the guardian tz', () => {
    expect(footerLabel({ code: 'AB-0183', startsAt: new Date('2026-09-29T22:30:00Z'), tz: 'Asia/Riyadh' })).toBe(
      'AB-0183 | 2026-09-30',
    );
  });

  it('the template escapes the label, numbers the pages, and is never below 12px', () => {
    const html = footerTemplate('AB-0183 <b>');
    expect(html).toContain('AB-0183 &#60;b&#62;');
    expect(html).toContain('<span class="pageNumber"></span> / <span class="totalPages"></span>');
    expect(html).toContain('font:12px');
  });
});
