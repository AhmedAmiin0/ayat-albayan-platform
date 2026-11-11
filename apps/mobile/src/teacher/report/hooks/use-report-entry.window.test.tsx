import { renderHook } from '@testing-library/react-native';
import type { ReportView } from '@ab/shared';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { reportView } from '@/teacher/report/testing/fixtures';
import { useReportEntry } from './use-report-entry';

jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: jest.fn(),
  apiSend: jest.fn(),
}));

const SENT = {
  status: 'submitted' as const,
  version: 1,
  submitted_at: '2026-10-03T14:00:00.000Z',
  edit_until: '2026-10-03T14:30:00.000Z',
};

test('the refetch at the close reaches the open form: it flips to closed (review 11-11)', async () => {
  const open = reportView({ ...SENT, can_edit: true, notes: 'ملاحظة' });
  const { result, rerender } = await renderHook(
    ({ report }: { report: ReportView }) => useReportEntry(report, 'quran'),
    { initialProps: { report: open }, wrapper: queryWrapper(createTestQueryClient()) },
  );
  expect(result.current.mode.mode).not.toBe('closed');
  const closed = reportView({ ...SENT, can_edit: false, sent_at: '2026-10-03T14:31:00.000Z' });
  await rerender({ report: closed });
  expect(result.current.mode.mode).toBe('closed');
  expect(result.current.mode.locked).toBe(true);
  expect(result.current.report.sent_at).toBe('2026-10-03T14:31:00.000Z');
});
