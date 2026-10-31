import type { RoomPlatform } from '@/classroom/room/model/room-types';
import type { useRoomSession } from '@/classroom/room/state/use-room-session';
import { t } from '@/core/lib/i18n/i18n';
import { RoomEnd } from './RoomEnd';
import { RoomLive } from '@/classroom/room/live/RoomLive';
import { RoomNotice } from './RoomNotice';
import { RoomPermission } from '@/classroom/room/preview/RoomPermission';
import { RoomPreview } from '@/classroom/room/preview/RoomPreview';

type Session = ReturnType<typeof useRoomSession>;

interface RoomBodyProps {
  session: Session;
  platform: RoomPlatform;
  /** «غادر»: leave and close the screen. */
  onLeave: () => void;
  onBack: () => void;
}

/** The step the session is on (docs/35 §3). */
export function RoomBody({ session: s, platform, onLeave, onBack }: RoomBodyProps) {
  const { phase } = s;
  switch (phase.step) {
    case 'checking':
    case 'joining':
      return <RoomNotice testID={`room-${phase.step}`} message={t.mobileRoom.connecting} busy />;
    case 'permission':
      return <RoomPermission onAllow={() => void s.allow()} onSkip={() => void s.skip()} />;
    case 'preview':
      return (
        <RoomPreview
          PreviewVideo={platform.PreviewVideo}
          preview={s.preview}
          notice={phase.notice}
          onJoin={() => void s.join()}
        />
      );
    case 'live': {
      const controls = { ...s.controls, switchCamera: () => void s.controls.switchCamera() };
      return (
        <RoomLive snap={s.snap} Video={platform.Video} controls={{ ...controls, leave: onLeave }} />
      );
    }
    case 'failed':
    case 'closed':
      return <RoomEnd phase={phase} onAgain={s.retry} onBack={onBack} />;
  }
}
