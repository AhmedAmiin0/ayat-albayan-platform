import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { signOutDevice } from '@/more/sign-out';
import { AssistantMoreScreen } from './AssistantMoreScreen';

jest.mock('@/more/sign-out', () => ({ signOutDevice: jest.fn(async () => undefined) }));

test('the assistant «المزيد»: role line, appearance, language, sign-out', async () => {
  await render(<AssistantMoreScreen />);
  expect(screen.getByRole('header', { name: t.mobile.more })).toBeTruthy();
  expect(screen.getByText(t.mobileRoles.assistantRole)).toBeTruthy();
  expect(screen.getByRole('header', { name: t.language.label })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.auth.logout }));
  expect(signOutDevice).toHaveBeenCalled();
});
