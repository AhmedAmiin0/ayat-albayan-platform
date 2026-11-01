import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking, type AlertButton } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { ensureCameraPermission } from './camera-permission';

jest.mock('expo-image-picker', () => ({
  getCameraPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
}));

const getPermission = jest.mocked(ImagePicker.getCameraPermissionsAsync);
const requestPermission = jest.mocked(ImagePicker.requestCameraPermissionsAsync);
type Perm = Awaited<ReturnType<typeof ImagePicker.getCameraPermissionsAsync>>;
const perm = (granted: boolean, canAskAgain = true) =>
  ({ granted, canAskAgain, status: granted ? 'granted' : 'undetermined', expires: 'never' }) as Perm;

/** Answers the alert by pressing the button with this label. */
function answer(label: string) {
  return jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons?: AlertButton[]) => {
    buttons?.find((b) => b.text === label)?.onPress?.();
  });
}

const m = t.payments.mobile;

beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());

test('already granted: no alert, no prompt', async () => {
  getPermission.mockResolvedValue(perm(true));
  const alert = answer(m.takePhoto);
  await expect(ensureCameraPermission()).resolves.toBe(true);
  expect(alert).not.toHaveBeenCalled();
  expect(requestPermission).not.toHaveBeenCalled();
});

test('first time: the Arabic rationale, then the system prompt', async () => {
  getPermission.mockResolvedValue(perm(false));
  requestPermission.mockResolvedValue(perm(true));
  const alert = answer(m.takePhoto);
  await expect(ensureCameraPermission()).resolves.toBe(true);
  expect(alert).toHaveBeenCalledWith(
    m.cameraTitle,
    m.cameraRationale,
    expect.any(Array),
    expect.objectContaining({ cancelable: true }),
  );
  expect(requestPermission).toHaveBeenCalledTimes(1);
});

test('«إلغاء» on the rationale: no system prompt', async () => {
  getPermission.mockResolvedValue(perm(false));
  answer(t.common.cancel);
  await expect(ensureCameraPermission()).resolves.toBe(false);
  expect(requestPermission).not.toHaveBeenCalled();
});

test('refused at the system prompt: false', async () => {
  getPermission.mockResolvedValue(perm(false));
  requestPermission.mockResolvedValue(perm(false, false));
  answer(m.takePhoto);
  await expect(ensureCameraPermission()).resolves.toBe(false);
});

test('refused for good: explains, and «افتح الإعدادات» opens the phone settings', async () => {
  getPermission.mockResolvedValue(perm(false, false));
  const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
  const alert = answer(m.openSettings);
  await expect(ensureCameraPermission()).resolves.toBe(false);
  expect(alert).toHaveBeenCalledWith(m.cameraTitle, m.cameraDenied, expect.any(Array));
  expect(openSettings).toHaveBeenCalled();
  expect(requestPermission).not.toHaveBeenCalled();
});
