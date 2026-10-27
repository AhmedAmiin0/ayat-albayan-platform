import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { ReportFieldRow } from './ReportFieldRow';

// An English run: the native flag is LTR (jest.setup reports RTL, the Arabic default).
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});

const alignOf = (text: string) => StyleSheet.flatten(screen.getByText(text).props.style).textAlign;
const row = (value: string | null) => <ReportFieldRow field={{ key: 'recited', label: t.reports.recited, value }} />;

test('English: a value in the UI language at the start, one in the other language to the right', async () => {
  await render(row('Al-Mulk 1-10'));
  expect(alignOf('Al-Mulk 1-10')).toBe('left');
  await render(row('سورة الملك ١-١٠'));
  expect(alignOf('سورة الملك ١-١٠')).toBe('right');
});

test('English: a blank value says so at the start', async () => {
  await render(row(null));
  expect(alignOf(t.mobileAdmin.reports.noContent)).toBe('left');
});
