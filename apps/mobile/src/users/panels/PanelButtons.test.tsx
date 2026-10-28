import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { palette } from '@/theme';
import { PanelButtons } from './PanelButtons';

const styleOf = (name: string) => StyleSheet.flatten(screen.getByRole('button', { name }).props.style);

test('docs/07 «الأزرار»: the verb filled first, «إلغاء» outlined beside it, in one ButtonRow', async () => {
  const onCancel = jest.fn();
  await render(<PanelButtons confirmLabel="احذف" onConfirm={jest.fn()} onCancel={onCancel} />);
  const cells = screen.getAllByTestId('button-row-cell');
  const holds = (label: string) => cells.map((cell) => within(cell).queryByText(label) !== null);
  expect(holds('احذف')).toEqual([true, false]);
  expect(holds(t.common.cancel)).toEqual([false, true]);
  expect(styleOf('احذف')).toMatchObject({ backgroundColor: palette.light.lapisFill });
  expect(styleOf(t.common.cancel)).toMatchObject({ borderWidth: 1, borderColor: palette.light.ruleInput });
  await fireEvent.press(screen.getByRole('button', { name: t.common.cancel }));
  expect(onCancel).toHaveBeenCalledTimes(1);
});
