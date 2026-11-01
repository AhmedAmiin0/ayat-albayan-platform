import { render, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { palette } from '@/theme';
import { ReceiptPicker } from '@/payments/ReceiptPicker';
import { AttachmentRow } from './AttachmentRow';
import type { Attachment } from './attachments';
import { PhotoButtons } from './PhotoButtons';

jest.mock('@/core/lib/receipts/receipt', () => ({ pickReceipt: jest.fn() }));
const m = t.payments.mobile;

test('docs/07 «الأزرار»: the receipt picker and the photo buttons are one ButtonRow of two cells', async () => {
  await render(<ReceiptPicker receipt={null} onChange={jest.fn()} />);
  const cells = screen.getAllByTestId('button-row-cell');
  expect(cells).toHaveLength(2);
  expect(within(cells[0] as (typeof cells)[number]).getByText(m.takePhoto)).toBeTruthy();
  expect(within(cells[1] as (typeof cells)[number]).getByText(m.pickPhoto)).toBeTruthy();
});

test('the bank attachments\' camera | gallery are one ButtonRow too', async () => {
  await render(<PhotoButtons camera="cam" library="lib" tooLarge="big" onPicked={jest.fn()} />);
  expect(screen.getAllByTestId('button-row-cell')).toHaveLength(2);
});

test('«احذف المرفق» is a danger button in its own cell (never a shrink-wrapped ghost)', async () => {
  const item: Attachment = { kind: 'chat', messageId: 'w1', path: 'a/b.jpg' };
  const text = { attachmentN: t.payments.attachmentN, attachmentRemove: t.payments.attachmentRemove };
  await render(<AttachmentRow item={item} n={1} text={text} onRemove={jest.fn()} />);
  const cell = screen.getByTestId('attachment-remove');
  expect(StyleSheet.flatten(cell.props.style)).toMatchObject({ flex: 1 });
  const button = within(cell).getByRole('button');
  expect(StyleSheet.flatten(button.props.style)).toMatchObject({ borderColor: palette.light.bad });
});
