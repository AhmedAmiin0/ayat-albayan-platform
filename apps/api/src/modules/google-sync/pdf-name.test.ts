import { describe, expect, it } from 'vitest';
import { contentHash } from './content-hash';
import { attendanceSheetName, pdfName, studentFolderName } from './pdf-name';

describe('PDF name (docs/24 §1, §2.5)', () => {
  it('names it «<student> — <date>.pdf»', () => {
    expect(pdfName({ student: 'أحمد محمد', date: '2026-10-21', alreadyInSheet: false })).toBe('أحمد محمد — 2026-10-21.pdf');
  });

  it('adds « (المنصة)» before .pdf when the old script already has that date', () => {
    expect(pdfName({ student: 'أحمد محمد', date: '2026-10-21', alreadyInSheet: true })).toBe('أحمد محمد — 2026-10-21 (المنصة).pdf');
  });

  it('never lets a name carry a path', () => {
    expect(pdfName({ student: ' a/b\\c ', date: '2026-10-21', alreadyInSheet: false })).toBe('a b c — 2026-10-21.pdf');
    expect(studentFolderName('سارة/علي')).toBe('سارة علي');
    expect(attendanceSheetName('سارة')).toBe('سجل حضور — سارة');
  });
});

describe('content hash', () => {
  it('ignores key order and changes with any value', () => {
    expect(contentHash({ a: 1, b: { c: [1, 2], d: 'x' } })).toBe(contentHash({ b: { d: 'x', c: [1, 2] }, a: 1 }));
    expect(contentHash({ a: 1 })).not.toBe(contentHash({ a: 2 }));
    expect(contentHash([1, 2])).not.toBe(contentHash([2, 1]));
  });
});
