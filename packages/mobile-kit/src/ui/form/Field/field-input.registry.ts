import { Platform } from 'react-native';

/**
 * Where @expo/ui's input can replace React Native's. Android stays on React Native: the keyboard
 * library (KeyboardScroll) tracks only a focused EditText, and a Compose field is not one, so a
 * form would leave it under the keyboard.
 */
const NATIVE_INPUT: Readonly<Partial<Record<typeof Platform.OS, true>>> = { ios: true };

export const nativeInputOn = (os: typeof Platform.OS = Platform.OS) => NATIVE_INPUT[os] ?? false;
