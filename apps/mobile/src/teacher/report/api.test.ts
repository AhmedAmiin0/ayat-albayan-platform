import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { reportErrorText, withReport } from './api';
import { formResponse, reportView } from './fixtures';

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
