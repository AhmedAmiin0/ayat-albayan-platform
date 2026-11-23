import type { MeetingInviteResult } from '@ab/schedule';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { InviteResultRow } from './InviteResultRow';

const R = t.meetingInvites.results;

/** The personal links are shown this once only. */
export function InviteResults({ results }: { results: readonly MeetingInviteResult[] }) {
  if (results.length === 0) return null;
  const links = results.some((r) => r.link !== null);
  return (
    <section aria-label={R.title} className="grid gap-1">
      <h3 className="text-sm font-semibold">{R.title}</h3>
      {links && <p className="text-xs text-ink-3">{R.linkOnce}</p>}
      <ul>
        {results.map((r) => (
          <InviteResultRow key={r.id} result={r} />
        ))}
      </ul>
    </section>
  );
}
