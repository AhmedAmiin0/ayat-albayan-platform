import ar from '@ab/shared/i18n/ar.json' with { type: 'json' };
import en from '@ab/shared/i18n/en.json' with { type: 'json' };
import { emptyContent, type ReportContent, type ReportView } from '@ab/shared';
import { reportView } from '@ab/shared/testing';
import { describe, expect, it } from 'vitest';
import { reportV2Lines, type ReportV2Text } from '../index.js';

const AR: ReportV2Text = { v2: ar.reports.v2, grade: ar.enums.grade, program: ar.enums.program, lang: 'ar' };
const content = (over: Partial<ReportContent>): ReportContent => ({ ...emptyContent(), ...over });
const v2 = (over: Partial<ReportView>) => reportView({ form_version: 2, attendance: 'on_time', ...over });
const values = (r: ReportView, text = AR) => Object.fromEntries(reportV2Lines(r, text).map((l) => [l.key, l.value]));

describe('reportV2Lines (admin read view)', () => {
  it('a Quran lesson: each part with its range and grade, tajweed, overall, plan and note', () => {
    const r = v2({
      content: content({
        segments: [
          { kind: 'recited', surah: 67, from: 1, to: 15, grade: 'excellent' },
          { kind: 'new', surah: 67, from: 16, to: 22, grade: null },
        ],
        tajweed: 'madd',
        quick: ['keep_going'],
      }),
      grade_overall: 'very_good',
      homework: 'مراجعة',
      next_plan: 'الملك 23–30',
      notes: 'تحسّن واضح',
    });
    const lines = reportV2Lines(r, AR);
    expect(lines.map((l) => l.label)).toEqual([
      'الحضور', 'البرنامج', 'التسميع', 'الحفظ الجديد', 'الدرس النظري / التجويد',
      'التقدير العام', 'الواجب قبل الحلقة القادمة', 'الحلقة القادمة', 'ملاحظة للأسرة',
    ]);
    const v = values(r);
    expect(v['segment.0']).toBe(`سورة الملك · الآيات 1–15 · ${ar.enums.grade.excellent}`);
    expect(v['segment.1']).toBe('سورة الملك · الآيات 16–22');
    expect(v.tajweed).toBe('المدود');
    expect(v.note).toBe('أحسنت، استمر. تحسّن واضح');
  });

  it('attended without parts says there is no content; a blank note is null', () => {
    const v = values(v2({ content: null }));
    expect(v.segments).toBe(ar.reports.v2.admin.noContent);
    expect(v.note).toBeNull();
    expect(v.overall).toBeNull();
  });

  it('absent: the attendance line and the note only', () => {
    const lines = reportV2Lines(v2({ attendance: 'absent', notes: 'نرجو الإبلاغ' }), AR);
    expect(lines).toEqual([
      { key: 'attendance', label: 'الحضور', value: 'غياب بدون إشعار' },
      { key: 'note', label: 'ملاحظة للأسرة', value: 'نرجو الإبلاغ' },
    ]);
  });

  it('Arabic and Islamic studies: topic, area, memorized and the graded rows', () => {
    const arabic = values(v2({ program: 'arabic', content: content({ arabic: { topic: 'الجملة الاسمية', skills: { reading: 'good', writing: null, listening: null, grammar: null } } }) }));
    expect(arabic.topic).toBe('الجملة الاسمية');
    expect(arabic['skill.reading']).toBe(ar.enums.grade.good);
    expect(arabic['skill.writing']).toBeNull();
    const islamic = values(v2({ program: 'islamic_studies', content: content({ islamic: { domain: 'fiqh', topic: 'الوضوء', memorized: null, rates: { comprehension: 'excellent', participation: null } } }) }));
    expect(islamic.domain).toBe('الفقه');
    expect('memorized' in islamic).toBe(false);
    expect(islamic['rate.comprehension']).toBe(ar.enums.grade.excellent);
  });

  it('English words and surah names', () => {
    const EN: ReportV2Text = { v2: en.reports.v2, grade: en.enums.grade, program: en.enums.program, lang: 'en' };
    const r = v2({ content: content({ segments: [{ kind: 'revision', surah: 68, from: 1, to: 20, grade: 'good' }] }) });
    const line = reportV2Lines(r, EN).find((l) => l.key === 'segment.0');
    expect(line).toEqual({ key: 'segment.0', label: 'Revision', value: `Surah Al-Qalam · ayahs 1–20 · ${en.enums.grade.good}` });
  });
});
