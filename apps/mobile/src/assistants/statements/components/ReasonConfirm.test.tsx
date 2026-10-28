import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { ReasonConfirm } from './ReasonConfirm';

test('docs/07 «الأزرار»: the verb first, «إلغاء» beside it; a short reason does not confirm', async () => {
  const onConfirm = jest.fn();
  await render(<ReasonConfirm message="?" confirmLabel="ألغِ" busy={false} onConfirm={onConfirm} onCancel={jest.fn()} />);
  const cells = screen.getAllByTestId('button-row-cell');
  expect(cells.map((cell) => within(cell).queryByText('ألغِ') !== null)).toEqual([true, false]);
  expect(cells.map((cell) => within(cell).queryByText(t.common.cancel) !== null)).toEqual([false, true]);
  await fireEvent.press(screen.getByRole('button', { name: 'ألغِ' }));
  expect(onConfirm).not.toHaveBeenCalled();
  expect(screen.getByText(t.assistants.error.reason_required)).toBeTruthy();
});
