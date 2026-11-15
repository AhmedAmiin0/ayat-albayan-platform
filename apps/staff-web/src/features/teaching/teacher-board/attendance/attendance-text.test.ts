import type { AttendanceTableRow } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { monthLabel, rowNote, totalsLine } from './attendance-text';

const CLOCK = { cycle: '24', locale: 'ar', tz: 'Africa/Cairo' } as const;
const row = (over: Partial<AttendanceTableRow> = {}): AttendanceTableRow => ({
  lesson_id: 'l-1',
  starts_at: '2026-10-03T13:00:00.000Z',
  duration_min: 45,
  teacher_name: 'أبرار',
  status: 'completed',
  attendance: 'on_time',
  kind: 'present',
  report_sent: true,
  report_id: 'r-1',
  cancel_reason: null,
  is_trial: false,
  is_makeup: false,
  is_rescheduled: false,
  ...over,
});

describe('attendance-text (docs/46 C5)', () => {
  it('month names', () => {
    expect(monthLabel('2026-10')).toBe('أكتوبر 2026');
  });

  it('the totals line in the owner order, cancels summed', () => {
    const totals = {
      held: 3, late: 1, absent: 2, excused: 0,
      cancelled_by_teacher: 1, cancelled_by_admin: 2,
      rescheduled: 0, unmarked: 4,
    };
    expect(totalsLine(totals)).toBe('حضر 3 · غاب 2 · بعذر 0 · متأخر 1 · ألغيت 3 · أُجّلت 0');
  });

  it('a row note: only the tags that apply, then the reason', () => {
    expect(rowNote(row(), CLOCK)).toBe('');
    expect(rowNote(row({ is_trial: true, attendance: 'late' }), CLOCK)).toBe(
      `${t.sales.student.log.trial} · ${t.sales.student.log.late}`,
    );
    expect(rowNote(row({ kind: 'cancelled', status: 'cancelled_by_teacher', cancel_reason: 'سفر', is_makeup: true }), CLOCK)).toBe(
      `${t.sales.student.log.makeup} · ${t.sales.student.log.cancelReason.replace('{reason}', 'سفر')}`,
    );
  });

  it('move lines (docs/47): the new time, the old one and the reason, in the viewer clock', () => {
    const log = t.sales.student.log;
    const moved = row({ status: 'rescheduled', kind: null, moved_to: '2026-10-05T13:00:00.000Z' });
    expect(rowNote({ ...moved, move_reason: 'سفر' }, CLOCK)).toBe(
      `${log.movedTo.replace('{when}', 'الاثنين 5 أكتوبر 16:00')} · ${log.moveReason.replace('{reason}', 'سفر')}`,
    );
    const riyadh = { ...CLOCK, tz: 'Asia/Riyadh' };
    const replacement = row({ is_rescheduled: true, moved_from: '2026-10-01T13:00:00.000Z' });
    expect(rowNote(replacement, riyadh)).toBe(
      `${log.moved} · ${log.movedFrom.replace('{when}', 'الخميس 1 أكتوبر 16:00')}`,
    );
    expect(rowNote(row({ moved_from: null, moved_to: null, move_reason: null }), CLOCK)).toBe('');
  });
});

