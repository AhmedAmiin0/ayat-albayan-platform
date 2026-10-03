// Native-module doubles shared by the flow tests (expo-device, expo-notifications, image picker).
// The factories are wired by jest.mock in app-router.tsx; tests flip `native` to steer them.

type Listener = (event: unknown) => void;

export const native = {
  isDevice: false,
  /** getExpoPushTokenAsync: a token, or an Error to reject with (an APK without Firebase). */
  token: 'ExponentPushToken[flow]' as string | Error,
  listeners: {} as { received?: Listener; response?: Listener },
  lastResponse: null as unknown,
};

export function resetNative(): void {
  native.isDevice = false;
  native.token = 'ExponentPushToken[flow]';
  native.listeners = {};
  native.lastResponse = null;
}

export const deviceMock = () => ({
  get isDevice() {
    return native.isDevice;
  },
});

export const notificationsMock = () => {
  const sub = { remove: jest.fn() };
  const granted = { granted: true, canAskAgain: true, status: 'granted', expires: 'never' };
  return {
    AndroidImportance: { HIGH: 4 },
    setNotificationHandler: jest.fn(),
    setNotificationChannelAsync: jest.fn(async () => null),
    getPermissionsAsync: jest.fn(async () => granted),
    requestPermissionsAsync: jest.fn(async () => granted),
    getExpoPushTokenAsync: jest.fn(async () => {
      if (native.token instanceof Error) throw native.token;
      return { type: 'expo', data: native.token };
    }),
    getLastNotificationResponse: jest.fn(() => native.lastResponse),
    clearLastNotificationResponse: jest.fn(),
    addNotificationReceivedListener: jest.fn((fn: Listener) => {
      native.listeners.received = fn;
      return sub;
    }),
    addNotificationResponseReceivedListener: jest.fn((fn: Listener) => {
      native.listeners.response = fn;
      return sub;
    }),
  };
};

export const imagePickerMock = () => ({
  getCameraPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
});

/** The camera is allowed and takes one photo: 5 bytes of «JPEG», as the picker hands them over. */
export function armCamera(uri = 'file:///cache/slip.jpg'): void {
  const picker = jest.requireMock('expo-image-picker') as Record<string, jest.Mock>;
  picker['getCameraPermissionsAsync']?.mockResolvedValue({ granted: true, canAskAgain: true, status: 'granted', expires: 'never' });
  picker['launchCameraAsync']?.mockResolvedValue({
    canceled: false,
    assets: [{ uri, width: 900, height: 1200, base64: 'aGVsbG8=', mimeType: 'image/jpeg' }],
  });
}
