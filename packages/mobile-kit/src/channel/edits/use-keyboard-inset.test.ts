import { act, renderHook } from '@testing-library/react-native';
import { DeviceEventEmitter, Platform } from 'react-native';
import { useKeyboardInset } from './use-keyboard-inset';

const show = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
const hide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

test('the sheet pads by the keyboard while it is open', async () => {
  const { result } = await renderHook(() => useKeyboardInset());
  expect(result.current).toBe(0);
  await act(async () => {
    DeviceEventEmitter.emit(show, { endCoordinates: { height: 300, screenY: 500 } });
  });
  expect(result.current).toBe(300);
  await act(async () => {
    DeviceEventEmitter.emit(hide, { endCoordinates: { height: 0, screenY: 800 } });
  });
  expect(result.current).toBe(0);
});
