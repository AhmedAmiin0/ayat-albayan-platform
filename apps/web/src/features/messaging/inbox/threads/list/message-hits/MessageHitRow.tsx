import { formatPhone, type MessageSearchHit } from '@ab/shared';
import { Avatar } from '@/components/ui/display/avatar';
import { t } from '@/lib/i18n/i18n';
import { useClock } from '@/lib/clock';
import { fullTime, listTime } from '@/features/messaging/inbox/format';
import { showsPhone, useInboxMode } from '@/features/messaging/inbox/shared/mode';
import { SearchMarks } from '@/features/messaging/inbox/search/SearchMarks';

export interface MessageHitRowProps {
  hit: MessageSearchHit;
  /** The searched words (marked in the snippet). */
  q: string;
  /** The chat is open at this hit. */
  active: boolean;
  now: Date;
  onOpen: (hit: MessageSearchHit) => void;
}

/** A chat without a name: its number, except for a teacher, who never sees a family's number. */
const unnamed = (hit: MessageSearchHit, phones: boolean): string =>
  phones ? formatPhone(hit.phone_e164) : t.inbox.unknownNumber;

/** One hit (docs/37): the chat's name, the message's day or clock, the snippet with the match. */
export function MessageHitRow({ hit, q, active, now, onOpen }: MessageHitRowProps) {
  const clock = useClock();
  const phones = showsPhone(useInboxMode());
  const name = hit.display_name ?? unnamed(hit, phones);
  return (
    <li>
      <button
        type="button"
        aria-current={active ? 'true' : undefined}
        onClick={() => onOpen(hit)}
        className="grid w-full cursor-pointer grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b border-rule px-2.5 py-3 text-start text-ink transition-colors duration-[120ms] hover:bg-sunk/75 aria-[current=true]:bg-gold-wash/60"
      >
        <Avatar name={name} id={hit.phone_e164} size="md" decorative className="row-span-2 self-start" />
        <span className="min-w-0 truncate font-semibold">{name}</span>
        <time dateTime={hit.created_at} title={fullTime(hit.created_at, clock)} className="text-2xs text-ink-3 tabular-nums">
          {listTime(hit.created_at, clock, now)}
        </time>
        <span dir="auto" className="col-span-2 col-start-2 line-clamp-2 min-w-0 text-start text-xs text-ink-2">
          <SearchMarks text={hit.snippet} q={q} />
        </span>
      </button>
    </li>
  );
}
