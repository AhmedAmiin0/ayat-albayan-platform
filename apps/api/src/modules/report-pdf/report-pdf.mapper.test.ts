import { describe, expect, it } from 'vitest';
import { toMessage, toModel } from './report-pdf.mapper';
import { sampleSource } from './report-pdf.fakes';

const NOW = new Date('2026-09-29T15:12:00Z');

describe('report PDF mapper (R-REP-01: everything derived from the DB)', () => {
  it('maps the report, lesson, student and teacher into the template model', () => {
    const model = toModel(sampleSource(), NOW);
    expect(model).toMatchObject({
      student: { name: 'سلمى عبد الرحمن', code: 'AB-0183' },
      teacherName: 'هدى سامي',
      program: 'quran',
      startsAt: new Date('2026-09-29T14:00:00Z'),
      endsAt: new Date('2026-09-29T14:45:00Z'),
      tz: 'Asia/Riyadh',
      lessonNo: 14,
      slot: { position: 6, total: 8 },
      attendance: 'on_time',
      recited: 'سورة النبأ 1-20',
      newMemorization: 'سورة النازعات 1-15',
      overall: 'very_good',
      nextPlan: 'خطة',
      generatedAt: NOW,
    });
  });

  it('reads the six rubric columns by name (RUBRIC_COLUMN)', () => {
    expect(toModel(sampleSource(), NOW).grades).toEqual({
      recitation: 'excellent',
      memorization: 'very_good',
      revision: 'good',
      tajweed: 'acceptable',
      engagement: 'needs_review',
      commitment: null,
    });
  });

  it('lesson number: the completed sequence, else completed-before + 1 (R-LES-03)', () => {
    expect(toModel(sampleSource({ seq: null, completedBefore: 4 }), NOW).lessonNo).toBe(5);
  });

  it('no package unit used → no slot (the template shows the plain number)', () => {
    expect(toModel(sampleSource({ packageN: null }), NOW).slot).toBeNull();
  });

  it('times are shown in the guardian zone', () => {
    const src = sampleSource({ guardian: { id: 'g1', phone_e164: '+201001234567', tz: 'Africa/Cairo' } });
    expect(toModel(src, NOW).tz).toBe('Africa/Cairo');
  });

  it('refuses a report without attendance (a draft never reaches the job)', () => {
    const src = sampleSource();
    expect(() => toModel({ ...src, report: { ...src.report, attendance: null } }, NOW)).toThrow(
      'report has no attendance',
    );
  });

  it('builds the report_ready message for the stored path', () => {
    const msg = toMessage(sampleSource(), 's1/l1.pdf', NOW);
    expect(msg).toMatchObject({
      guardian_id: 'g1',
      lesson_id: 'l1',
      phone_e164: '+966551234567',
      dedup_key: 'report_ready:r1',
      template_params: {
        '1': 'سلمى عبد الرحمن',
        document: { bucket: 'reports', path: 's1/l1.pdf', filename: 'AB-0183_2026-09-29_تقرير-الحلقة.pdf' },
      },
    });
  });
});
