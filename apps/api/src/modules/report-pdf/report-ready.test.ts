import { describe, expect, it } from 'vitest';
import { reportFileName, reportReadyDedupKey, reportReadyMessage } from './report-ready';

const guardian = { id: 'g1', phone_e164: '+966551234567', tz: 'Asia/Riyadh' };
const NOW = new Date('2026-09-29T15:12:00Z');

describe('report_ready message (R-REP-03, R-MSG-01, docs/11 §5)', () => {
  it('file name: code, the local lesson date, the ar.json suffix', () => {
    expect(
      reportFileName({ code: 'AB-0183', startsAt: new Date('2026-09-29T22:30:00Z'), tz: 'Asia/Riyadh' }),
    ).toBe('AB-0183_2026-09-30_تقرير-الحلقة.pdf');
  });

  it('one message per report, whatever the version', () => {
    expect(reportReadyDedupKey('r1')).toBe('report_ready:r1');
  });

  it('queues the template with the student, the guardian-zone time and the PDF document', () => {
    const msg = reportReadyMessage(
      {
        reportId: 'r1',
        lessonId: 'l1',
        studentName: 'سلمى',
        studentCode: 'AB-0183',
        startsAt: new Date('2026-09-29T14:00:00Z'),
        guardian,
        pdfPath: 's1/l1.pdf',
      },
      NOW,
    );
    expect(msg).toEqual({
      direction: 'outbound',
      status: 'queued',
      phone_e164: '+966551234567',
      guardian_id: 'g1',
      lesson_id: 'l1',
      template_key: 'report_ready',
      template_params: {
        '1': 'سلمى',
        '2': 'الثلاثاء 29 سبتمبر 17:00',
        document: { bucket: 'reports', path: 's1/l1.pdf', filename: 'AB-0183_2026-09-29_تقرير-الحلقة.pdf' },
      },
      dedup_key: 'report_ready:r1',
      scheduled_for: '2026-09-29T15:12:00.000Z',
    });
  });

  it('formats {{2}} in the guardian zone, not the student or the teacher', () => {
    const msg = reportReadyMessage(
      {
        reportId: 'r1',
        lessonId: 'l1',
        studentName: 'سلمى',
        studentCode: 'AB-0183',
        startsAt: new Date('2026-09-29T14:00:00Z'),
        guardian: { ...guardian, tz: 'Europe/London' },
        pdfPath: 's1/l1.pdf',
      },
      NOW,
    );
    expect(msg.template_params['2']).toBe('الثلاثاء 29 سبتمبر 15:00');
  });
});
