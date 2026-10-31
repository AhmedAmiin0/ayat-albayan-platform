/**
 * Where a platform room opens (docs/35): in the app when the academy setting `meetings_in_app` is
 * on AND this binary carries LiveKit's native module; otherwise the web page in the browser, as
 * before.
 */
type RoomMode = 'app' | 'browser';

export const roomMode = (settingOn: boolean, nativeOk: boolean): RoomMode =>
  settingOn && nativeOk ? 'app' : 'browser';
