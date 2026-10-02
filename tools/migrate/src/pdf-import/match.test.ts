// PDF file names → lesson reports, on invented students and files.
import { describe, expect, it } from 'vitest';
import { resolve } from '../plan/resolve.ts';
import { parsePdfName } from './files.ts';
import { R, bundle, report } from './match.fixture.ts';
import { lessonDay, matchPdfs } from './match.ts';

describe('parsePdfName', () => {
  it('reads folder, name, date and re-download number', () => {
    expect(parsePdfName(`${R}ليلى سالم/ليلى سالم — 2026-09-21.pdf`)).toMatchObject({
      folder: 'ليلى سالم',
      person: 'ليلى سالم',
      date: '2026-09-21',
      copy: 0,
    });
    expect(parsePdfName(`${R}ليلى — 2026-09-21 (1).pdf`)).toMatchObject({ folder: null, copy: 1 });
  });
  it('rejects other files, deeper paths and undated names', () => {
    expect(parsePdfName(`${R}ليلى/سجل حضور — ليلى.xlsx`)).toBeUndefined();
    expect(parsePdfName(`${R}a/مرفقات/x — 2026-09-21.pdf`)).toBeUndefined();
    expect(parsePdfName(`${R}ليلى/تقرير.pdf`)).toBeUndefined();
    expect(parsePdfName('other/x — 2026-09-21.pdf')).toBeUndefined();
  });
});

describe('lessonDay', () => {
  it('reads the local day from report-derived and rule lesson keys', () => {
    expect(lessonDay('abrar|+201|ليلى|2026-09-21')).toBe('2026-09-21');
    expect(lessonDay('abrar|+201|ليلى|2026-09-20T22:30:00.000Z')).toBe('2026-09-21');
    expect(lessonDay('junk')).toBe('');
  });
});

describe('matchPdfs', () => {
  const reports = [
    ...report({ name: 'ليلى سالم', day: '2026-09-21' }),
    ...report({ name: 'هالة', day: '2026-09-22' }),
    ...report({ name: 'تالا', day: '2026-09-22' }),
  ];

  it('matches by student folder + date to the report and its refs', () => {
    const files = [`${R}ليلي سالم/ليلي سالم — 2026-09-21.pdf`];
    const [m] = matchPdfs(bundle({ files, reports }));
    expect(m?.ok).toBe(true);
    if (!m?.ok) return;
    expect(m.key.entity).toBe('report_pdfs');
    expect(m.value.columns).toEqual({ zip_path: files[0] });
    expect(Object.keys(m.value.refs)).toEqual(['report_id', 'student_id', 'lesson_id']);
    expect(m.issues).toEqual([]);
  });

  it('sends unmatched, undated and ambiguous PDFs to review', () => {
    const files = [
      `${R}ليلى سالم/ليلى سالم — 2026-09-25.pdf`,
      `${R}ليلى سالم/تقرير.pdf`,
      `${R}هالة وتالا/هالة وتالا — 2026-09-22.pdf`,
    ];
    const out = matchPdfs(bundle({ files, reports }));
    expect(out.map((m) => m.ok)).toEqual([false, false, false]);
    expect(out.flatMap((m) => m.issues).map((i) => [i.code, i.severity, i.entity])).toEqual([
      ['missing_ref', 'review', 'report_pdfs'],
      ['missing_ref', 'review', 'report_pdfs'],
      ['missing_ref', 'review', 'report_pdfs'],
    ]);
    expect(out[2]?.issues[0]?.detail).toContain('2 reports match');
  });

  it('finds nothing when reports are not planned (no lesson_reports module)', () => {
    const b = { ...bundle({ files: [`${R}ليلى/ليلى — 2026-09-21.pdf`], reports: [] }) };
    expect(matchPdfs({ ...b, earlier: new Map() }).map((m) => m.ok)).toEqual([false]);
  });
});

describe('matchPdfs: weak matches need the owner (wrong PDF = wrong parent)', () => {
  const files = [`${R}هالة محمد/هالة — 2026-09-22 (1).pdf`, `${R}هالة محمد/هالة — 2026-09-22.pdf`];
  const reports = report({ name: 'هالة', day: '2026-09-22' });

  it('holds a similar folder name back for review, never attaches it', () => {
    const out = matchPdfs(bundle({ files, reports }));
    expect(out.map((m) => m.ok)).toEqual([false, false]);
    expect(out[0]?.issues).toMatchObject([{ severity: 'review', entity: 'report_pdfs' }]);
    expect(out[0]?.issues[0]?.detail).toContain('similar student name');
  });

  it('attaches it once the zip path is approved, originals before copies', () => {
    const out = matchPdfs(bundle({ files, reports, approved: files }));
    expect(out.map((m) => m.ok && m.value.columns['zip_path'])).toEqual([files[1], files[0]]);
    const kept = resolve(out);
    expect(kept.kept).toHaveLength(1);
    expect(kept.issues.filter((i) => i.code === 'conflict')).toHaveLength(1);
  });

  it('proposes a report submitted on the PDF date when none was held that day', () => {
    const late = report({ name: 'ليلى', day: '2026-09-20', sentAt: '2026-09-21T10:00:00.000Z' });
    const pdf = `${R}ليلى/ليلى — 2026-09-21.pdf`;
    const [held] = matchPdfs(bundle({ files: [pdf], reports: late }));
    expect(held?.ok).toBe(false);
    expect(held?.issues[0]?.detail).toContain('lesson 2026-09-20');
    const [ok] = matchPdfs(bundle({ files: [pdf], reports: late, approved: [pdf] }));
    expect(ok?.ok).toBe(true);
  });
});
