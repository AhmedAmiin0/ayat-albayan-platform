import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { palette } from '@/theme';
import { InvoiceActions } from './InvoiceActions';

const style = (name: string) => StyleSheet.flatten(screen.getByRole('button', { name }).props.style);

test('docs/07 «الأزرار»: camera | gallery | «من الشات» as one ButtonRow; «أزلها» danger, alone under it', async () => {
  const onRemove = jest.fn();
  await render(<InvoiceActions picked busy={false} onPick={jest.fn()} onChat={jest.fn()} onRemove={onRemove} />);
  const cells = screen.getAllByTestId('button-row-cell');
  expect(cells).toHaveLength(3);
  expect(within(cells[0] as (typeof cells)[number]).getByText(t.payments.mobile.retake)).toBeTruthy();
  expect(within(cells[2] as (typeof cells)[number]).getByText(t.booking.invoice.fromChat)).toBeTruthy();
  cells.forEach((c) => expect(within(c).queryByText(t.booking.invoice.remove)).toBeNull());
  expect(style(t.booking.invoice.remove)).toMatchObject({ borderColor: palette.light.bad });
  await fireEvent.press(screen.getByRole('button', { name: t.booking.invoice.remove }));
  expect(onRemove).toHaveBeenCalled();
});

test('nothing picked and no chat number: two cells, no remove', async () => {
  await render(<InvoiceActions picked={false} busy={false} onPick={jest.fn()} onRemove={jest.fn()} />);
  expect(screen.getAllByTestId('button-row-cell')).toHaveLength(2);
  expect(screen.queryByText(t.booking.invoice.remove)).toBeNull();
});
