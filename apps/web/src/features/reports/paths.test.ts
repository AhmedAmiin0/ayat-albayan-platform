import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { reportErrorText } from './api';
import { fileLabel } from './entry/AttachmentsField';
import { reportFormHref, reportHistoryHref, reportOpen } from './paths';
import { isPlainClick } from './history/ReportLink';

describe('report links (R-REP-01: opened from the lesson)', () => {
  it('teacher form per lesson; admin per student', () => {
    expect(reportFormHref({ role: 'teacher', lessonId: 'l', studentId: 's' })).toBe('/teacher/report/l');
    expect(reportFormHref({ role: 'admin', lessonId: 'l', studentId: 's' })).toBe('/admin/students/s/reports/l');
    expect(reportHistoryHref('admin', 's')).toBe('/admin/students/s/reports');
    expect(reportHistoryHref('teacher', 's')).toBe('/teacher/reports/s');
  });

  it('open once started, never for a cancelled / moved lesson', () => {
    const now = new Date('2026-10-03T13:00:00Z');
    expect(reportOpen({ status: 'scheduled', starts_at: '2026-10-03T13:00:00Z' }, now)).toBe(true);
    expect(reportOpen({ status: 'completed', starts_at: '2026-10-01T13:00:00Z' }, now)).toBe(true);
    expect(reportOpen({ status: 'scheduled', starts_at: '2026-10-03T13:00:01Z' }, now)).toBe(false);
    expect(reportOpen({ status: 'rescheduled', starts_at: '2026-10-01T13:00:00Z' }, now)).toBe(false);
  });

  it('only a plain left click is taken over by the router', () => {
    const click = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false };
    expect(isPlainClick(click)).toBe(true);
    expect(isPlainClick({ ...click, ctrlKey: true })).toBe(false);
    expect(isPlainClick({ ...click, button: 1 })).toBe(false);
  });
});

describe('reportErrorText / fileLabel', () => {
  it('domain codes and validation issues read in Arabic; anything else is the generic line', () => {
    expect(reportErrorText(new ApiError(409, { code: 'edit_window_closed' }))).toBe('انتهت مدة تعديل التقرير، تواصل مع الإدارة');
    expect(reportErrorText(new ApiError(400, { message: 'validation_failed', issues: [{ message: 'missing_grades' }] }))).toBe(
      'قيّم كل البنود والتقدير العام قبل الإرسال',
    );
    expect(reportErrorText(new Error('x'))).toBe('حدثت مشكلة، حاول مرة أخرى');
  });

  it('attachments read by kind and size', () => {
    expect(fileLabel({ mime: 'application/pdf', size: 2_097_152 })).toBe('ملف PDF · 2.0 ميجا');
    expect(fileLabel({ mime: 'audio/mpeg', size: 10 })).toBe('تسجيل صوتي · 0.1 ميجا');
    expect(fileLabel({ mime: 'image/png', size: 524_288 })).toBe('صورة · 0.5 ميجا');
  });
});
