import { t } from '@ab/mobile-kit';

/** The quieter white lines over the lapis fill: 0.92 keeps 4.5:1 (0.85 read 4.43:1). */
export const SOFT_INK = 0.92;

/**
 * Under the button: a live room the app opens itself (useRoomsInApp) goes straight in
 * with the mic on (canvas RoomXLiveHome); otherwise the browser room.
 */
export const noteOf = (live: boolean, inApp: boolean): string =>
  live && inApp ? t.portal.app.lesson.roomNoteLive : t.portal.app.lesson.roomNote;
