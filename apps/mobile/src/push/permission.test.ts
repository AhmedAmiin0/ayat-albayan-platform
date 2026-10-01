import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Alert, type AlertButton } from 'react-native';
import { t } from '@/lib/i18n';
import { ASK_AGAIN_MS, ASKED_KEY, ensurePushPermission } from './permission';

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
}));

const getPermissions = jest.mocked(Notifications.getPermissionsAsync);
const requestPermissions = jest.mocked(Notifications.requestPermissionsAsync);
type Perm = Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>;
const perm = (granted: boolean, canAskAgain = true) =>
  ({ granted, canAskAgain, status: granted ? 'granted' : 'undetermined', expires: 'never' }) as Perm;

/** Answers the rationale alert by pressing the button with this label. */
function answerRationale(label: string) {
  return jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons?: AlertButton[]) => {
    buttons?.find((b) => b.text === label)?.onPress?.();
  });
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});
afterEach(() => jest.restoreAllMocks());

test('already granted: true, no alert, no prompt', async () => {
  getPermissions.mockResolvedValue(perm(true));
  const alert = answerRationale(t.mobile.pushAllow);
  await expect(ensurePushPermission()).resolves.toBe(true);
  expect(alert).not.toHaveBeenCalled();
  expect(requestPermissions).not.toHaveBeenCalled();
});

test('first time: Arabic rationale, then the system prompt', async () => {
  getPermissions.mockResolvedValue(perm(false));
  requestPermissions.mockResolvedValue(perm(true));
  const alert = answerRationale(t.mobile.pushAllow);
  await expect(ensurePushPermission()).resolves.toBe(true);
  expect(alert).toHaveBeenCalledWith(
    t.mobile.pushTitle,
    t.mobile.pushRationale,
    expect.any(Array),
    expect.objectContaining({ cancelable: true }),
  );
  expect(requestPermissions).toHaveBeenCalledTimes(1);
});

test('«مش دلوقتي» skips the system prompt; the rationale comes back only a week later', async () => {
  getPermissions.mockResolvedValue(perm(false));
  const alert = answerRationale(t.mobile.pushLater);
  await expect(ensurePushPermission()).resolves.toBe(false);
  expect(requestPermissions).not.toHaveBeenCalled();

  await expect(ensurePushPermission()).resolves.toBe(false);
  expect(alert).toHaveBeenCalledTimes(1);

  await AsyncStorage.setItem(ASKED_KEY, String(Date.now() - ASK_AGAIN_MS - 1));
  await expect(ensurePushPermission()).resolves.toBe(false);
  expect(alert).toHaveBeenCalledTimes(2);
});

test('a device that said «مش دلوقتي» before this change (stored "1") is asked again', async () => {
  getPermissions.mockResolvedValue(perm(false));
  await AsyncStorage.setItem(ASKED_KEY, '1');
  const alert = answerRationale(t.mobile.pushLater);
  await ensurePushPermission();
  expect(alert).toHaveBeenCalledTimes(1);
});

test('the OS refuses to ask again: no alert at all', async () => {
  getPermissions.mockResolvedValue(perm(false, false));
  const alert = answerRationale(t.mobile.pushAllow);
  await expect(ensurePushPermission()).resolves.toBe(false);
  expect(alert).not.toHaveBeenCalled();
});

test('system prompt denied: false', async () => {
  getPermissions.mockResolvedValue(perm(false));
  requestPermissions.mockResolvedValue(perm(false, false));
  answerRationale(t.mobile.pushAllow);
  await expect(ensurePushPermission()).resolves.toBe(false);
});
