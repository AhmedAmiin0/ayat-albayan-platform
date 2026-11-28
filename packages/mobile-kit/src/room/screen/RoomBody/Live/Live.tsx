import { LiveSheet } from '../../../live/LiveSheet';
import { RoomLive } from '../../../live/RoomLive';
import type { LiveProps } from './Live.types';
import { liveControls } from './live.helpers';

export function Live({ screen, platform }: LiveProps) {
  return (
    <RoomLive
      snap={screen.session.snap}
      Video={platform.Video}
      controls={liveControls(screen)}
      chatUnread={screen.chat ? screen.chat.unread : null}
      sheet={
        <LiveSheet
          which={screen.sheet}
          panel={screen.panel}
          onClose={screen.closeSheet}
          onLeave={screen.leave}
          presence={screen.presence}
          onBrowser={screen.browser}
        />
      }
    />
  );
}
