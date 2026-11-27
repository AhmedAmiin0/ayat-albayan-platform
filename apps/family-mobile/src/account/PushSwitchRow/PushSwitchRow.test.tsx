import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t, PUSH_OPT_OUT_KEY } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing';
import { PushSwitchRow } from './PushSwitchRow';

const mockRegister = jest.fn(async () => undefined);
const mockUnregister = jest.fn(async () => undefined);
jest.mock('@ab/mobile-kit/push/registerPush', () => ({
  registerPush: () => mockRegister(),
  unregisterPush: () => mockUnregister(),
}));

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

const show = () => renderWithQuery(<PushSwitchRow hint="hint" />, freshQueryClient());
const pushSwitch = () => screen.getByLabelText(t.familyApp.settings.notifications);

test('the hint under the switch; the switch waits for the saved choice', async () => {
  await show();
  expect(screen.getByText('hint')).toBeTruthy();
  await waitFor(() => expect(pushSwitch().props.value).toBe(true));
  expect(pushSwitch().props.disabled).toBe(false);
});

test('a phone that opted out shows the switch off; on registers it again', async () => {
  await AsyncStorage.setItem(PUSH_OPT_OUT_KEY, '1');
  await show();
  await waitFor(() => expect(pushSwitch().props.value).toBe(false));
  await fireEvent(pushSwitch(), 'valueChange', true);
  await waitFor(() => expect(mockRegister).toHaveBeenCalled());
  await waitFor(() => expect(pushSwitch().props.value).toBe(true));
});
