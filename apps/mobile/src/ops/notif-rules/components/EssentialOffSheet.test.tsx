import { render, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { palette } from '@/theme';
import { EssentialOffSheet } from './EssentialOffSheet';

const r = t.mobileNotificationRules;

test('docs/07 «الأزرار»: «إيقاف» (danger) then «إلغاء» (secondary) in one ButtonRow', async () => {
  await render(<EssentialOffSheet name="x" busy={false} error={undefined} onConfirm={jest.fn()} onClose={jest.fn()} />);
  const cells = screen.getAllByTestId('button-row-cell');
  expect(cells.map((cell) => within(cell).queryByText(r.turnOff) !== null)).toEqual([true, false]);
  expect(cells.map((cell) => within(cell).queryByText(r.cancel) !== null)).toEqual([false, true]);
  const off = screen.getByRole('button', { name: r.turnOff });
  expect(StyleSheet.flatten(off.props.style)).toMatchObject({ borderWidth: 1, borderColor: palette.light.bad });
});
