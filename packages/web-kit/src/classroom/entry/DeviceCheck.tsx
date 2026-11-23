import type { RoomJoinResult } from '@ab/shared';
import { Button, FormAlert, Card } from '#/components/ui/index.ts';
import { t } from '#/lib/i18n/index.ts';
import { ContextHeader } from '#/classroom/flow/ContextHeader.tsx';
import type { RoomContext } from '#/classroom/flow/room-kit.ts';
import { RecordedNotice } from '#/classroom/recordings/RecordedNotice.tsx';
import { RoomIcon } from '#/classroom/room/components/room-icons.tsx';
import type { MediaChoice } from '#/classroom/room/components/room-types.ts';
import { CheckControls } from './CheckControls';
import { CheckPreview } from './CheckPreview';
import type { JoinPick } from './saved-choice';
import { useDeviceCheck, type DeviceCheckController } from './use-device-check';

interface Props {
  join: RoomJoinResult;
  context: RoomContext | null;
  onJoin: (pick: JoinPick) => void;
  /** «رجوع»: back to the page, without joining. */
  onBack?: (() => void) | undefined;
}

const C = t.roomFlow.check;
const FIRST: MediaChoice = { mic: true, cam: true };

/** One alert per distinct problem (a refused mic and camera read as two lines, «none» as one). */
function Problems({ check }: { check: DeviceCheckController }) {
  const lines = [...new Set([check.mic.problem, check.cam.problem])].filter((x) => x !== null);
  if (lines.length === 0) return null;
  return (
    <FormAlert>
      <span className="flex flex-wrap items-center gap-x-3">
        {lines.join(' · ')}
        <Button type="button" variant="ghost" size="sm" onClick={check.retry}>
          {t.classroom.retry}
        </Button>
      </span>
    </FormAlert>
  );
}

/**
 * «قبل الدخول» (boards FamRoomWebCheck / FamRoomPhoneCheck): one's own camera and microphone
 * before connecting, with their switches and device lists; a refused or missing device says so
 * with «حاول مرة أخرى»; the consent line unless this room records nothing; «انضم الآن».
 */
export function DeviceCheck({ join, context, onJoin, onBack }: Props) {
  const check = useDeviceCheck(FIRST);
  return (
    <main className="flex min-h-dvh flex-col bg-page">
      <ContextHeader context={context} />
      <div className="mx-auto grid w-full max-w-6xl flex-1 content-center gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-center lg:gap-8">
        <section aria-label={C.title} className="grid gap-3">
          <Problems check={check} />
          <CheckPreview cam={check.cam.state} />
          <CheckControls check={check} />
        </section>
        <Card className="grid animate-fade-up gap-4 p-5">
          <div className="grid gap-1">
            <h2 className="text-2xl font-bold">{C.title}</h2>
            <p className="text-sm text-ink-2">{C.hint}</p>
          </div>
          {context?.presence}
          {join.recording !== 'off' && <RecordedNotice />}
          <p className="text-xs text-ink-2">{t.mobileRoom.remember}</p>
          <Button type="button" size="lg" onClick={() => onJoin(check.choice())}>
            <RoomIcon name="cam" />
            {t.mobileRoom.preview.join}
          </Button>
          {onBack && (
            <Button type="button" variant="secondary" size="lg" onClick={onBack}>
              {t.mobileRoom.back}
            </Button>
          )}
        </Card>
      </div>
    </main>
  );
}
