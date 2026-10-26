import { describe, expect, it } from 'vitest';
import { attendanceRow, attendanceStats, matchDate, textCell } from './attendance-row';
import { findSummaryRow, newSummaryRow, summaryLinks, summaryUpdates, type SummaryStudent } from './summary-row';

const FOLDER = 'Folder_ABCDEFGHIJ';
const SHEET = 'Sheet_ABCDEFGHIJK';
const PDF = 'Pdf_ABCDEFGHIJKLM';
const STUDENT: SummaryStudent = { name: 'أحمد محمد', teacherName: 'Teacher A', program: 'quran', folderId: FOLDER, attendanceSheetId: SHEET };

describe('summary row (docs/24 §2.6)', () => {
  it('matches by the folder link first, even when the name differs', () => {
    const rows = [['أحمد محمد', '', '', '', '', 1, 'https://drive.google.com/drive/folders/Other_ABCDEFGHIJ'], ['احمد  محمّد آخر', '', '', '', '', 2, `=HYPERLINK("https://drive.google.com/drive/folders/${FOLDER}","مجلد")`]];
    expect(findSummaryRow(rows, STUDENT)).toBe(3);
  });

  it('then by the normalised Arabic name (hamza, tashkeel, spaces)', () => {
    const rows = [['محمود', '', '', '', '', 1, ''], ['  احمد مُحمد ', '', '', '', '', 4, '']];
    expect(findSummaryRow(rows, STUDENT)).toBe(3);
    expect(findSummaryRow([['سارة']], STUDENT)).toBeNull();
  });

  it('a new row has all 8 columns with the links', () => {
    const row = newSummaryRow(STUDENT, { first: '2026-10-01', last: '2026-10-21', count: 5 });
    expect(row).toEqual(['أحمد محمد', 'Teacher A', 'القرآن الكريم', '2026-10-01', '2026-10-21', 5,
      `https://drive.google.com/drive/folders/${FOLDER}`, `https://docs.google.com/spreadsheets/d/${SHEET}/edit`]);
  });

  it('an existing row: D..F recomputed, G/H filled only when blank, A..C untouched', () => {
    const stats = { first: '2026-09-01', last: '2026-10-21', count: 9 };
    expect(summaryUpdates(['أحمد', 'T', 'P', 'x', 'y', 1, 'link', 'sheet'], STUDENT, stats)).toEqual([{ range: 'D', values: ['2026-09-01', '2026-10-21', 9] }]);
    expect(summaryUpdates(['أحمد', 'T', 'P'], STUDENT, stats).map((u) => u.range)).toEqual(['D', 'G', 'H']);
  });

  it('reads the student links for discovery suggestions', () => {
    const rows = [['أحمد', '', '', '', '', 1, `https://drive.google.com/drive/folders/${FOLDER}`, `https://docs.google.com/spreadsheets/d/${SHEET}/edit`], ['بدون رابط']];
    expect(summaryLinks(rows)).toEqual([{ name: 'أحمد', folderId: FOLDER, sheetId: SHEET }]);
  });
});

describe('attendance row (docs/24 §1, 13 columns)', () => {
  const input = {
    date: '2026-10-21', seq: 7, teacherName: 'Teacher A', program: 'quran' as const, attendance: 'on_time' as const,
    recited: 'الفاتحة', newMemorization: 'البقرة 1-5', revision: '=SUM(1)', gradeOverall: 'excellent' as const,
    notes: null, homework: 'مراجعة', meetingLink: 'https://meet.google.com/x', pdfFileId: PDF,
  };

  it('maps every column in order, the PDF link last', () => {
    const row = attendanceRow(input);
    expect(row).toHaveLength(13);
    expect(row).toEqual(['2026-10-21', 7, 'Teacher A', 'القرآن الكريم', 'حضرت في الموعد', 'الفاتحة', 'البقرة 1-5', "'=SUM(1)",
      'ممتاز', '', 'مراجعة', 'https://meet.google.com/x', `https://drive.google.com/file/d/${PDF}/view`]);
  });

  it('keeps a formula-looking text as text', () => {
    expect(textCell('+966')).toBe("'+966");
    expect(textCell('@x')).toBe("'@x");
    expect(textCell('عادي')).toBe('عادي');
  });

  it('tells our row (same date and PDF link) from the script’s row of the same date', () => {
    const rows = [[46316, 1, '', '', '', '', '', '', '', '', '', '', 'https://drive.google.com/file/d/Script_ABCDEFGHIJ/view'], ['2026-10-22', 2, '', '', '', '', '', '', '', '', '', '', `https://drive.google.com/file/d/${PDF}/view`]];
    expect(matchDate(rows, { date: '2026-10-21', pdfFileId: PDF })).toEqual({ kind: 'script' });
    expect(matchDate(rows, { date: '2026-10-22', pdfFileId: PDF })).toEqual({ kind: 'ours', row: 3 });
    expect(matchDate(rows, { date: '2026-10-23', pdfFileId: PDF })).toEqual({ kind: 'none' });
  });

  it('recomputes first/last/count from the data rows', () => {
    expect(attendanceStats([['2026-10-21'], [46300], ['', ''], ['21/09/2026']])).toEqual({ first: '2026-09-21', last: '2026-10-21', count: 3 });
    expect(attendanceStats([])).toEqual({ first: null, last: null, count: 0 });
  });
});
