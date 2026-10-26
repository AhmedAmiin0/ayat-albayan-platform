import { describe, expect, it } from 'vitest';
import { attachment, riyadhStamp, safeText, toCsv } from './csv';

describe('toCsv (R-RPT-03)', () => {
  it('starts with the UTF-8 BOM, quotes every field, CRLF rows, trailing CRLF', () => {
    const csv = toCsv([
      ['الكود', 'الاسم'],
      ['AB-0183', 'سهيلة'],
    ]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.slice(1)).toBe('"الكود","الاسم"\r\n"AB-0183","سهيلة"\r\n');
  });

  it('doubles quotes, keeps commas and line breaks inside the field; null is empty; numbers as-is', () => {
    expect(toCsv([['قال "تمام"', 'أ، ب,ج', 'سطر\nتاني', null, 145.5]]).slice(1)).toBe(
      '"قال ""تمام""","أ، ب,ج","سطر\nتاني","","145.5"\r\n',
    );
  });
});

describe('safeText (CSV injection)', () => {
  it('prefixes a formula-looking start with an apostrophe', () => {
    expect(safeText('=HYPERLINK("x")')).toBe(`'=HYPERLINK("x")`);
    expect(safeText('+201001234567')).toBe(`'+201001234567`);
    expect(safeText('@cmd')).toBe(`'@cmd`);
    expect(safeText('-2')).toBe(`'-2`);
  });

  it('leaves normal text alone; null → empty', () => {
    expect(safeText('سهيلة')).toBe('سهيلة');
    expect(safeText(null)).toBe('');
    expect(safeText(undefined)).toBe('');
  });
});

describe('riyadhStamp / attachment', () => {
  it('an instant as Riyadh local date and time', () => {
    expect(riyadhStamp('2026-09-30T21:30:00.000Z')).toBe('2026-10-01 00:30');
    expect(riyadhStamp(null)).toBe('');
  });

  it('a quoted ASCII file name', () => {
    expect(attachment('lessons-2026-10-01_2026-10-07.csv')).toBe('attachment; filename="lessons-2026-10-01_2026-10-07.csv"');
  });
});
