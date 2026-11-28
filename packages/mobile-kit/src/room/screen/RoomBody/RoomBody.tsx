import { RoomPermission } from '../../preview/RoomPermission';
import { RoomPreview } from '../../preview/RoomPreview';
import { t } from '../../../lib/i18n/i18n';
import { RoomEnd } from '../RoomEnd';
import { RoomNotice } from '../RoomNotice';
import { Live } from './Live';
import type { RoomBodyProps } from './RoomBody.types';

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
