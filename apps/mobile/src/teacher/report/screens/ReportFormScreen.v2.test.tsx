import type { ReportFormResponse } from '@ab/shared';
import { screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { formResponse, formResponseV2 } from '../testing/fixtures';
import { ReportFormScreen } from './ReportFormScreen';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
  apiSend: jest.fn(),
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn() },
  useLocalSearchParams: () => ({ lessonId: 'l-1' }),
}));

const me = { id: 't-abrar', display_name_ar: 'أبرار', tz: 'Africa/Cairo', students: [] };

async function serve(form: ReportFormResponse) {
  mockApiFetch.mockImplementation(async (p: string) => (p === '/teachers/me' ? me : form));
  await renderWithQuery(<ReportFormScreen />);
}

test('a form_version 2 report opens the new form', async () => {
  await serve(formResponseV2());
  expect(await screen.findByText(t.reports.v2.send)).toBeTruthy();
  expect(screen.getByText(t.reports.v2.autoFilled)).toBeTruthy();
  expect(screen.queryByText(t.reports.readOnlyHint)).toBeNull();
  expect(screen.queryByText(t.reports.submit)).toBeNull();
});

test('flag off: a form_version 1 report keeps the old form', async () => {
  await serve(formResponse());
  expect(await screen.findByText(t.reports.readOnlyHint)).toBeTruthy();
  expect(screen.getByText(t.reports.submit)).toBeTruthy();
  expect(screen.queryByText(t.reports.v2.send)).toBeNull();
});
