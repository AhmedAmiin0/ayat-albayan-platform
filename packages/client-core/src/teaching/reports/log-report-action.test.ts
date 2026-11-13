import { describe, expect, it } from 'vitest';
import { logReportAction } from './log-report-action.js';

const now = new Date('2026-11-13T12:00:00.000Z');
const past = '2026-11-13T10:00:00.000Z';
const row = { status: 'completed', starts_at: past, report: null } as const;
const report = {
  status: 'submitted', submitted_at: '2026-11-13T11:50:00.000Z', sent_at: null,
  can_edit: true, edit_until: '2026-11-13T12:20:00.000Z',
} as const;

describe('logReportAction (docs/47)', () => {
  it('offers nothing before the start, on a cancelled or a moved lesson', () => {
    const future = { ...row, status: 'scheduled', starts_at: '2026-11-14T10:00:00Z' } as const;
    expect(logReportAction(future, now)).toBeNull();
    expect(logReportAction({ ...row, status: 'cancelled_by_admin' }, now)).toBeNull();
    expect(logReportAction({ ...row, status: 'rescheduled' }, now)).toBeNull();
  });

  it('a started lesson with no report: write', () => {
    expect(logReportAction(row, now)).toBe('write');
    expect(logReportAction({ status: 'scheduled', starts_at: past }, now)).toBe('write');
  });

  it('inside the window: edit; after it or once sent: view', () => {
    expect(logReportAction({ ...row, report }, now)).toBe('edit');
    const later = new Date('2026-11-13T12:30:00.000Z');
    expect(logReportAction({ ...row, report }, later)).toBe('view');
    const sent = { ...report, sent_at: '2026-11-13T11:55:00.000Z' };
    expect(logReportAction({ ...row, report: sent }, now)).toBe('view');
    expect(logReportAction({ ...row, report: { ...report, can_edit: false } }, now)).toBe('view');
  });
});
