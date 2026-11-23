import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { t, palette } from '@ab/mobile-kit';
import { renderWithQuery } from '@/test/query';
import { DETAIL } from '@/users/shared/fixtures';
import { UserActions } from '@/users/panels/UserActions/UserActions';

const styleOf = (name: string) => StyleSheet.flatten(screen.getByRole('button', { name }).props.style);

test('docs/07 «الأزرار»: «حذف» is the outlined danger button under the outlined account actions', async () => {
  await renderWithQuery(<UserActions user={DETAIL} onMode={jest.fn()} onDone={jest.fn()} />);
  expect(styleOf(t.users.actions.delete)).toMatchObject({ borderWidth: 1, borderColor: palette.light.bad });
  expect(styleOf(t.users.actions.resetPassword)).toMatchObject({ borderWidth: 1, borderColor: palette.light.ruleInput });
});
