/** Query keys of the device's own room support (never a server read). */
export const nativeRoomKeys = {
  platform: () => ['native-room', 'platform'] as const,
};
