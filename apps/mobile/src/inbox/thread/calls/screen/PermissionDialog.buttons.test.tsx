import { screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { palette } from '@/theme';
import { PermissionDialog } from './PermissionDialog';

const styleOf = (name: string) => StyleSheet.flatten(within(screen.getByTestId('call-permission')).getByRole('button', { name }).props.style);

test('docs/07 «الأزرار»: «اطلب إذن الاتصال» (filled) then «إغلاق» (outlined), one ButtonRow', async () => {
  await renderWithQuery(<PermissionDialog ask={{ phone: '+966552147730', state: 'request' }} onClose={jest.fn()} onSent={jest.fn()} />);
  const cells = within(screen.getByTestId('call-permission-actions')).getAllByTestId('button-row-cell');
  expect(cells).toHaveLength(2);
  expect(within(cells[0] as (typeof cells)[number]).getByText(t.calls.permission.request)).toBeTruthy();
  expect(within(cells[1] as (typeof cells)[number]).getByText(t.common.close)).toBeTruthy();
  expect(styleOf(t.calls.permission.request)).toMatchObject({ backgroundColor: palette.light.lapisFill });
  expect(styleOf(t.common.close)).toMatchObject({ borderWidth: 1, borderColor: palette.light.ruleInput });
});

test('outside the window only «إغلاق» shows, filling the row', async () => {
  await renderWithQuery(<PermissionDialog ask={{ phone: '+966552147730', state: 'needs_template' }} onClose={jest.fn()} onSent={jest.fn()} />);
  expect(within(screen.getByTestId('call-permission-actions')).getAllByTestId('button-row-cell')).toHaveLength(1);
});
