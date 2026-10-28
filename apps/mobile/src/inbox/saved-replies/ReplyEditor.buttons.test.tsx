import { screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { palette } from '@/theme';
import { ReplyEditor } from './ReplyEditor';

jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: () => new Promise(() => undefined),
}));

const styleOf = (name: string) => StyleSheet.flatten(screen.getByRole('button', { name }).props.style);

test('docs/07 «الأزرار»: «حفظ» (filled) and «إلغاء» (outlined) are one ButtonRow, save first; the file picks are a row too', async () => {
  await renderWithQuery(<ReplyEditor reply={null} scope="mine" onDone={jest.fn()} />);
  const cells = screen.getAllByTestId('button-row-cell');
  const labels = [t.inbox.composer.attachImage, t.inbox.composer.attachPdf, t.common.save, t.common.cancel];
  expect(cells).toHaveLength(labels.length);
  labels.forEach((label, i) => expect(within(cells[i] as (typeof cells)[number]).getByText(label)).toBeTruthy());
  expect(styleOf(t.common.save)).toMatchObject({ minHeight: 48, backgroundColor: palette.light.lapisFill });
  expect(styleOf(t.common.cancel)).toMatchObject({ borderWidth: 1, borderColor: palette.light.ruleInput });
});
