import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { palette } from '@/theme';
import { DETAIL } from '../shared/fixtures';
import { UserActions } from './UserActions';

const styleOf = (name: string) => StyleSheet.flatten(screen.getByRole('button', { name }).props.style);

test('docs/07 «الأزرار»: «حذف» is the outlined danger button under the outlined account actions', async () => {
  await renderWithQuery(<UserActions user={DETAIL} onMode={jest.fn()} onDone={jest.fn()} />);
  expect(styleOf(t.users.actions.delete)).toMatchObject({ borderWidth: 1, borderColor: palette.light.bad });
  expect(styleOf(t.users.actions.resetPassword)).toMatchObject({ borderWidth: 1, borderColor: palette.light.ruleInput });
});
