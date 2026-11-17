import { LiveSheet } from '@/classroom/room/live/LiveSheet';
import { RoomLive } from '@/classroom/room/live/RoomLive';
import type { RoomPlatform } from '@/classroom/room/model/room-types';
import { RoomPermission } from '@/classroom/room/preview/RoomPermission';
import { RoomPreview } from '@/classroom/room/preview/RoomPreview';
import { t } from '@ab/mobile-kit';
import { RoomEnd } from './RoomEnd';
import { RoomNotice } from './RoomNotice';
import type { useRoomScreen } from './use-room-screen';

interface RoomBodyProps {
  screen: ReturnType<typeof useRoomScreen>;
  platform: RoomPlatform;
}

/** In the room: the grid, the controls, «كتمك المعلم» and the panel open at the foot. */
function Live({ screen, platform }: RoomBodyProps) {
  const { session: s } = screen;
  const controls = {
    ...s.controls,
    switchCamera: () => void s.controls.switchCamera(),
    nextOutput: () => void s.controls.nextOutput(),
    openChat: () => screen.chat?.open(),
    leave: () => screen.openSheet('leave'),
  };
  const sheet = (
    <LiveSheet
      which={screen.sheet}
      panel={screen.panel}
      onClose={screen.closeSheet}
      onLeave={screen.leave}
      presence={screen.presence}
      onBrowser={screen.browser}
    />
  );
  return (
    <RoomLive
      snap={s.snap}
      Video={platform.Video}
      controls={controls}
      chatUnread={screen.chat ? screen.chat.unread : null}
      sheet={sheet}
    />
  );
}

/** The step the session is on (docs/35 §3). */
export function RoomBody({ screen, platform }: RoomBodyProps) {
  const { session: s } = screen;
  const { phase } = s;
  switch (phase.step) {
    case 'checking':
    case 'joining':
      return <RoomNotice testID={`room-${phase.step}`} message={t.mobileRoom.connecting} busy />;
    case 'permission':
      return (
        <RoomPermission
          onAllow={() => void s.allow()}
          onSkip={() => void s.skip()}
          onBrowser={screen.browser}
        />
      );
    case 'preview':
      return (
        <RoomPreview
          PreviewVideo={platform.PreviewVideo}
          preview={s.preview}
          notice={phase.notice}
          onJoin={() => void s.join()}
        />
      );
    case 'live':
      return <Live screen={screen} platform={platform} />;
    case 'failed':
    case 'closed':
      return (
        <RoomEnd
          phase={phase}
          kind={s.target.kind}
          presence={screen.presence}
          onAgain={s.retry}
          onBack={screen.back}
          onBrowser={screen.browser}
        />
      );
  }
}
