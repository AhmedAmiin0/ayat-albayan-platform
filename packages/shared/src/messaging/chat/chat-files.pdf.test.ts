import { describe, expect, it } from 'vitest';
import ar from '../../../i18n/ar.json' with { type: 'json' };
import en from '../../../i18n/en.json' with { type: 'json' };
import { isPdfMime, pdfBubbleName, pdfMetaLine } from './chat-files.js';

const KB = 1024;
const MB = 1024 * KB;
/** The FSI … PDI isolate pdfMetaLine puts around each part. */
const iso = (s: string) => `⁨${s}⁩`;
const line = (...parts: string[]) => parts.map(iso).join(' · ');

describe('isPdfMime', () => {
  it('application/pdf, with parameters or in capitals; nothing else', () => {
    expect(isPdfMime('application/pdf')).toBe(true);
    expect(isPdfMime('Application/PDF; name=x.pdf')).toBe(true);
    expect(isPdfMime('image/heic')).toBe(false);
    expect(isPdfMime(null)).toBe(false);
  });
});

describe('pdfMetaLine (owner 2026-10-29: «N pages · PDF · size» like WhatsApp)', () => {
  it('the exact Arabic line, each part isolated so «1.2» stays before «ميغابايت»', () => {
    expect(pdfMetaLine({ pages: 12, bytes: 1.2 * MB }, ar.inbox.pdf)).toBe(
      '⁨12 صفحة⁩ · ⁨PDF⁩ · ⁨1.2 ميغابايت⁩',
    );
  });

  it('Arabic page counts: one, two, few (3–10), other', () => {
    const pages = (n: number) => pdfMetaLine({ pages: n, bytes: MB }, ar.inbox.pdf).split(' · ')[0];
    expect([1, 2, 3, 11, 30].map(pages)).toEqual(['صفحة واحدة', 'صفحتان', '3 صفحات', '11 صفحة', '30 صفحة'].map(iso));
  });

  it('sizes: whole KB below 1 MB (at least 1), else MB with one decimal', () => {
    const size = (bytes: number) => pdfMetaLine({ pages: 1, bytes }, en.inbox.pdf).split(' · ')[2];
    expect([1, 1023 * KB, MB - 1, MB, 12.3 * MB].map(size)).toEqual(['1 KB', '1023 KB', '1023 KB', '1.0 MB', '12.3 MB'].map(iso));
  });

  it('English reads the same parts', () => {
    expect(pdfMetaLine({ pages: 2, bytes: 340 * KB }, en.inbox.pdf)).toBe(line('2 pages', 'PDF', '340 KB'));
    expect(pdfMetaLine({ pages: 1, bytes: 5 * MB }, en.inbox.pdf)).toBe(line('1 page', 'PDF', '5.0 MB'));
  });
});

describe('pdfBubbleName (owner 2026-11-01: a name like WhatsApp, never «File / File»)', () => {
  const untitled = ar.inbox.pdf.untitled;
  it('the file name first, trimmed', () => {
    expect(pdfBubbleName({ media_name: ' خطة الحفظ.pdf ', body: 'other.pdf' }, untitled)).toBe('خطة الحفظ.pdf');
  });
  it('no file name: the caption’s first line when it reads as a PDF’s name', () => {
    expect(pdfBubbleName({ media_name: null, body: ' report 3.PDF \nthe rest' }, untitled)).toBe('report 3.PDF');
  });
  it.each([
    ['no caption', null],
    ['a sentence', 'please see the plan'],
    ['a path', 'a/b.pdf'],
    ['the name on a later line', 'hello\nplan.pdf'],
    ['only the extension', '.pdf'],
  ])('%s: «ملف PDF» / «PDF document»', (_, body) => {
    expect(pdfBubbleName({ media_name: '  ', body }, untitled)).toBe(untitled);
    expect(pdfBubbleName({ body }, en.inbox.pdf.untitled)).toBe('PDF document');
  });
});
