import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { InlineConfirm } from './InlineConfirm';

test('message with cancel and confirm, defaulting to إلغاء / تأكيد', async () => {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();
  await render(<InlineConfirm message={t.common.yes} onConfirm={onConfirm} onCancel={onCancel} />);
  expect(screen.getByText(t.common.yes)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.common.cancel }));
  expect(onCancel).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByRole('button', { name: t.common.confirm }));
  expect(onConfirm).toHaveBeenCalledTimes(1);
});

test('custom labels; busy disables only the confirm', async () => {
  await render(
    <InlineConfirm
      message="?"
      confirmLabel={t.common.saving}
      cancelLabel={t.common.no}
      onConfirm={jest.fn()}
      onCancel={jest.fn()}
      busy
    />,
  );
  expect(screen.getByRole('button', { name: t.common.saving })).toBeDisabled();
  expect(screen.getByRole('button', { name: t.common.no })).toBeEnabled();
});

test('one ButtonRow: confirm (filled) first, the way out outlined beside it', async () => {
  await render(<InlineConfirm message="?" onConfirm={jest.fn()} onCancel={jest.fn()} />);
  const cells = screen.getAllByTestId('button-row-cell');
  expect(cells).toHaveLength(2);
  const holds = (label: string) => cells.map((cell) => within(cell).queryByText(label) !== null);
  expect(holds(t.common.confirm)).toEqual([true, false]);
  expect(holds(t.common.cancel)).toEqual([false, true]);
});
