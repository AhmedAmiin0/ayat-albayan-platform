import { emptyContent } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { formResponseV2 } from '../testing/fixtures';
import { ReportEntryCardV2 } from './ReportEntryCardV2';

// An English run: the native flag is LTR (jest.setup reports RTL, the Arabic default).
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiSend: jest.fn(),
}));

test('English: the form, its surah names and the picker speak English', async () => {
  const content = {
    ...emptyContent(),
    segments: [{ kind: 'recited' as const, surah: 67, from: 1, to: 15, grade: null }],
  };
  const form = formResponseV2({ report: { content } });
  const [entry] = form.entries;
  if (!entry) throw new Error('no entry');
  await renderWithQuery(<ReportEntryCardV2 form={form} entry={entry} tz="Africa/Cairo" />);
  expect(t.reports.v2.send).toBe('Send the report to the family');
  expect(screen.getByText('Lesson 9 of 12')).toBeTruthy();
  expect(screen.getByRole('radio', { name: 'Attended on time' })).toBeTruthy();
  expect(screen.getByText('Surah Al-Mulk · ayahs 1–15')).toBeTruthy();
  expect(screen.getByText('15 ayahs · pp. 562–563')).toBeTruthy();
  await fireEvent.press(screen.getByText('Surah Al-Mulk · ayahs 1–15'));
  expect(screen.getByLabelText('Search for a surah')).toBeTruthy();
  expect(screen.getByRole('radio', { name: 'Al-Qalam' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Done' })).toBeTruthy();
});
