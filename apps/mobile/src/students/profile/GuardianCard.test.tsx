import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { Linking, StyleSheet } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { palette } from '@/theme';
import { GuardianCard } from './GuardianCard';

const guardian = { id: 'g1', name: 'أم يوسف', phone_e164: '+966552147730' };
const styleOf = (name: string) => StyleSheet.flatten(screen.getByRole('button', { name }).props.style);

afterEach(() => jest.restoreAllMocks());

test('docs/07 «الأزرار»: «اتصال» outlined | «واتساب» filled, in one ButtonRow', async () => {
  await render(<GuardianCard guardian={guardian} />);
  const cells = screen.getAllByTestId('button-row-cell');
  const holds = (label: string) => cells.map((cell) => within(cell).queryByText(label) !== null);
  expect(holds(t.mobile.call)).toEqual([true, false]);
  expect(holds(t.mobile.whatsapp)).toEqual([false, true]);
  expect(styleOf(t.mobile.call)).toMatchObject({ borderWidth: 1, borderColor: palette.light.ruleInput });
  expect(styleOf(t.mobile.whatsapp)).toMatchObject({ backgroundColor: palette.light.lapisFill });
});

test('«اتصال» dials the guardian', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  await render(<GuardianCard guardian={guardian} />);
  await fireEvent.press(screen.getByRole('button', { name: t.mobile.call }));
  expect(open).toHaveBeenCalledWith('tel:+966552147730');
});
