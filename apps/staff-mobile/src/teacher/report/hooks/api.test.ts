import { Linking } from 'react-native';
import { ApiError, t } from '@ab/mobile-kit';
import { openAttachment, reportErrorText, withReport } from './api';
import { formResponse, reportView } from '@/teacher/report/testing/fixtures';

const mockApiFetch = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
}));

test('a domain code or the first validation issue, in the form’s words', () => {
  expect(reportErrorText(new ApiError(409, { code: 'version_conflict' }))).toBe(t.reports.error.version_conflict);
  expect(reportErrorText(new ApiError(403, { code: 'edit_window_closed' }))).toBe(t.reports.error.edit_window_closed);
  expect(reportErrorText(new ApiError(400, { issues: [{ message: 'missing_grades' }] }))).toBe(t.reports.error.missing_grades);
  expect(reportErrorText(new ApiError(409, { code: 'invalid_transition' }))).toBe(t.lessons.invalidTransition);
});

test('an unknown code is the common error; no connection says the report was not sent', () => {
  expect(reportErrorText(new ApiError(500, { code: 'boom' }))).toBe(t.common.error);
  expect(reportErrorText(new ApiError(502))).toBe(t.common.error);
  expect(reportErrorText(new TypeError('Network request failed'))).toBe(t.reports.offlineNotSent);
});

test('withReport puts an autosaved draft into the saved form, leaving the other students alone', () => {
  const form = formResponse();
  const saved = reportView({ recited: 'الفاتحة' });
  expect(withReport(form, saved)?.entries[0]?.report.recited).toBe('الفاتحة');
  expect(withReport(form, reportView({ id: 'r-other', recited: 'x' }))?.entries[0]?.report.recited).toBeNull();
  expect(withReport(undefined, saved)).toBeUndefined();
});

test('opens a file through its signed link; an answer without a link opens nothing', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  mockApiFetch.mockResolvedValueOnce({ url: 'https://files.test/a.png', expires_at: 'x' });
  await openAttachment('r-1', 'a-1');
  expect(mockApiFetch).toHaveBeenCalledWith('/reports/r-1/attachments/a-1/url');
  expect(open).toHaveBeenCalledWith('https://files.test/a.png');
  open.mockClear();
  mockApiFetch.mockResolvedValueOnce({});
  await expect(openAttachment('r-1', 'a-1')).rejects.toMatchObject({ body: { code: 'bad_response' } });
  expect(open).not.toHaveBeenCalled();
});
