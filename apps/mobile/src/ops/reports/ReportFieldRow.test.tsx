import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { ReportFieldRow } from './ReportFieldRow';

// Arabic (jest.setup: RTL): the teacher's words align by their own direction, not the UI's.

const alignOf = (text: string) => StyleSheet.flatten(screen.getByText(text).props.style).textAlign;
const row = (value: string | null) => <ReportFieldRow field={{ key: 'recited', label: t.reports.recited, value }} />;

test('Arabic: a value in the UI language at the start, one in the other language to the right', async () => {
  await render(row('سورة الملك ١-١٠'));
  expect(alignOf('سورة الملك ١-١٠')).toBe('left');
  await render(row('Al-Mulk 1-10'));
  expect(alignOf('Al-Mulk 1-10')).toBe('right');
});

test('Arabic: a blank value says so at the start', async () => {
  await render(row(null));
  expect(alignOf(t.mobileAdmin.reports.noContent)).toBe('left');
});
