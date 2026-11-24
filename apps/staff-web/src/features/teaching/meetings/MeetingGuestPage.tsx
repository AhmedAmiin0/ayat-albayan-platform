import { useQuery } from '@tanstack/react-query';
import { LanguageSwitch } from '@ab/web-kit/components/shell/LanguageSwitch';
import { Cartouche } from '@ab/web-kit/components/ui/display/cartouche';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { Logo } from '@ab/web-kit/components/ui/display/mark';
import { GuestJoinPage } from '@/features/teaching/classroom/join/GuestJoinPage';
import type { RoomClient } from '@ab/web-kit/classroom/room/components/room-types';
import { ApiError } from '@ab/web-kit/lib/http/api';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { joinMeetingAsGuest, publicMeetingQuery } from './internal/internal-api';
import { meetingJoinProblem } from './rows/meeting-join-errors';
import { guestScheduleText } from './scheduled/meeting-when';
import { useClock } from '@ab/web-kit/lib/clock';
import { useViewerTz } from '@ab/web-kit/lib/viewer-tz';

const L = t.meetings.internal.guest;

function Notice({ text, alert }: { text: string; alert?: boolean }) {
  return (
    <main className="min-h-dvh bg-page px-4 py-6 sm:py-10">
      <div className="mx-auto grid w-full max-w-[520px] gap-5">
        <div className="flex items-center justify-between gap-3">
          <Logo />
          <LanguageSwitch />
        </div>
        <Cartouche>{L.title}</Cartouche>
        {alert ? <FormAlert>{text}</FormAlert> : <p role="status" className="text-body text-ink-2">{text}</p>}
      </div>
    </main>
  );
}

/** Joining too early answers 403 join_not_open_yet with opens_at, which the join page reads out. */
export function MeetingGuestPage({ token, make }: { token: string; make?: () => RoomClient }) {
  const clock = useClock();
  const tz = useViewerTz();
  const view = useQuery(publicMeetingQuery(token));
  // A failed poll keeps the last answer (react-query keeps data): someone in the room stays in it.
  if (!view.data) {
    if (!view.isError) return <Notice text={L.loading} />;
    const gone = view.error instanceof ApiError && view.error.status === 404;
    return <Notice text={gone ? L.invalid : t.common.error} alert />;
  }
  if (view.data.state === 'ended') return <Notice text={L.ended} />;
  const early = guestScheduleText(view.data, { now: new Date(), tz }, clock);
  const intro = early ? `${early}. ${L.intro}` : L.intro;
  return (
    <GuestJoinPage
      linkToken={token}
      joinWith={joinMeetingAsGuest}
      title={view.data.title}
      intro={intro}
      problem={(e) => meetingJoinProblem(e, clock, tz)}
      {...(make && { make })}
    />
  );
}
