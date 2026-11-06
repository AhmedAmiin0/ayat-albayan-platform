/**
 * expo-image-manipulator, loaded only when a shared photo is sent (docs/38 §mobile 10). Its JS
 * asks for the native module as it loads, so a static import would crash an older APK that an OTA
 * reaches without it; Metro keeps this dynamic import lazy, evaluated on the first call.
 */
export const loadManipulator = () => import('expo-image-manipulator');
