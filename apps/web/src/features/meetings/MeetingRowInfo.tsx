import type { MeetingView } from '@ab/shared';
import { t } from '@/lib/i18n';
import { opensLine, scheduleLine } from './meeting-when';

const L = t.meetingInvites.list;
const chip = 'rounded-full border border-rule px-2 py-0.5 text-xs';

/** The row's title and facts: when (or «اجتماع فوري»), state, invitees, «أنت مدعو», «ملغى», «يُفتح الدخول …». */
export function MeetingRowInfo({ meeting, tz }: { meeting: MeetingView; tz: string }) {
  const opens = opensLine(meeting, tz);
  const state = meeting.state === 'open' ? t.meetings.internal.open : t.meetings.internal.ended;
  return (
    <div className="grid gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-body font-semibold">{meeting.title}</p>
        {meeting.cancelled_at ? <span className={`${chip} text-act`}>{L.cancelled}</span> : <span className="text-xs text-ink-3">{state}</span>}
        {meeting.my_invite && <span className={`${chip} text-ink-2`}>{L.invitedYou}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-3">
        <span>{scheduleLine(meeting, tz)}</span>
        {meeting.invitees_count > 0 && <span>{L.inviteesCount.replace('{n}', String(meeting.invitees_count))}</span>}
        {opens && <span className="text-ink-2">{opens}</span>}
      </div>
    </div>
  );
}
