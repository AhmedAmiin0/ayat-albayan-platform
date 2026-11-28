import type { RoomFlow } from '../RoomBody.types';

/** The room's buttons: the session's own, with the chat and leave going through the screen. */
export function liveControls(screen: RoomFlow) {
  const { controls } = screen.session;
  return {
    ...controls,
    switchCamera: () => void controls.switchCamera(),
    nextOutput: () => void controls.nextOutput(),
    openChat: () => screen.chat?.open(),
    leave: () => screen.openSheet('leave'),
  };
}
