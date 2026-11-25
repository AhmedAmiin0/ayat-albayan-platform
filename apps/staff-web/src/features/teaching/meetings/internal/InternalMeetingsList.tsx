import { useQuery } from '@tanstack/react-query';
import { FormAlert, t, useViewerTz } from '@ab/web-kit';
import { meetingsQuery } from './internal-api';
import { MeetingRow } from '@/features/teaching/meetings/rows/MeetingRow';

const L = t.meetings.internal;

interface Props {
  /** The viewer's zone (times are shown on it); useViewerTz() by default. */
  tz?: string;
  title?: string;
}

/** Admins see all; every meeting is recorded; the admin and the creator download recordings. */
export function InternalMeetingsList({ tz: pinned, title = L.list }: Props) {
  const viewer = useViewerTz();
  const tz = pinned ?? viewer;
  const meetings = useQuery(meetingsQuery);
  return (
    <section aria-label={title} className="mt-8">
      <h2 className="mb-2 font-display text-h3 font-bold">{title}</h2>
      {meetings.isPending && <p className="text-ink-3">{t.common.loading}</p>}
      {meetings.isError && <FormAlert>{t.common.error}</FormAlert>}
      {meetings.isSuccess && meetings.data.length === 0 && <p className="text-sm text-ink-3">{L.empty}</p>}
      <ul>
        {(meetings.data ?? []).map((m) => (
          <MeetingRow key={m.id} meeting={m} tz={tz} />
        ))}
      </ul>
    </section>
  );
}
