import { render, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { palette } from '@/theme';
import { QuoteActions } from './QuoteActions';

const styleOf = (name: string) => StyleSheet.flatten(screen.getByRole('button', { name }).props.style);

test('docs/07 «الأزرار»: «أرسل العرض» filled alone, then «عدّل» | «انسخ» outlined in one ButtonRow', async () => {
  await render(<QuoteActions open ready sending={false} onSend={jest.fn()} onEdit={jest.fn()} onCopy={jest.fn()} />);
  const cells = screen.getAllByTestId('button-row-cell');
  expect(cells).toHaveLength(2);
  expect(within(cells[0] as (typeof cells)[number]).getByText(t.inbox.quote.edit)).toBeTruthy();
  expect(within(cells[1] as (typeof cells)[number]).getByText(t.inbox.quote.copy)).toBeTruthy();
  expect(styleOf(t.inbox.quote.send)).toMatchObject({ backgroundColor: palette.light.lapisFill });
  expect(styleOf(t.inbox.quote.copy)).toMatchObject({ borderWidth: 1, borderColor: palette.light.ruleInput });
});
