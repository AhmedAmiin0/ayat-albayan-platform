import { describe, expect, it } from 'vitest';
import { sentFileName } from './thread-file-send.service';

describe('sentFileName: the name the family sees on a sent file', () => {
  it('a PDF always ends in .pdf, whatever the client named it (no invoice.html or update.apk)', () => {
    expect(sentFileName('invoice.html', 'application/pdf')).toBe('invoice.html.pdf');
    expect(sentFileName('جدول الحلقات', 'application/pdf')).toBe('جدول الحلقات.pdf');
    expect(sentFileName('جدول.PDF', 'application/pdf')).toBe('جدول.PDF');
  });

  it('stays within the 200-character column check', () => {
    expect(sentFileName('x'.repeat(200), 'application/pdf')).toHaveLength(200);
  });

  it('an image keeps its name (Meta shows none for an image)', () => {
    expect(sentFileName('الواجب.png', 'image/png')).toBe('الواجب.png');
  });
});
