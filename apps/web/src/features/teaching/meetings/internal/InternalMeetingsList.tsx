import { useQuery } from '@tanstack/react-query';
import { FormAlert } from '@/components/ui/form/form-alert';
import { t } from '@/lib/i18n/i18n';
import { useViewerTz } from '@/lib/viewer-tz';
import { meetingsQuery } from './internal-api';
import { MeetingRow } from '@/features/teaching/meetings/rows/MeetingRow';

const L = t.meetings.internal;

interface Props {
  /** The viewer's zone (times are shown on it); useViewerTz() by default. */
  tz?: string;
  /** The heading; «الاجتماعات الداخلية» by default. */
  title?: string;
}

/**
 * «الاجتماعات الداخلية»: the ones I created or am invited to (all for an admin), instant and
 * scheduled, each with its time, invitees, enter (inside the window) and the creator's actions.
 * Every meeting is recorded; the admin and the creator download the recordings.
 */
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
