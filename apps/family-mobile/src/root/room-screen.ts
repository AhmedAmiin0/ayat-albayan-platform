/** The in-app room covers the tabs and is left only by its own buttons, no swipe. */
export const ROOM_SCREEN = { presentation: 'fullScreenModal', gestureEnabled: false } as const;

/** The child's channel opened from inside the room: a sheet over it, the room still live. */
export const ROOM_CHAT_SCREEN = { presentation: 'modal' } as const;
