import { t } from '../../../lib/i18n/i18n';
import { RoomNotice } from '../RoomNotice';
import type { RoomEndProps } from './RoomEnd.types';
import { alertIcon, closedNotice } from './room-end.helpers';

export function RoomEnd({ phase, kind, presence, onAgain, onBack, onBrowser }: RoomEndProps) {
  if (phase.step === 'failed') {
    return (
      <RoomNotice
        testID="room-failed"
        message={phase.message}
        icon={alertIcon}
        again={{ label: t.classroom.retry, onPress: onAgain }}
        browser={onBrowser ? { label: t.mobileRoom.openInBrowser, onPress: onBrowser } : undefined}
        onBack={onBack}
      />
    );
  }
  return <RoomNotice {...closedNotice(phase, { kind, presence, onAgain })} onBack={onBack} />;
}
