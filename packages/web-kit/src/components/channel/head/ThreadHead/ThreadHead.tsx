import { headerPeople, threadMessages } from '@ab/client-core';
import type { ChannelPage } from '@ab/shared';
import type { ChannelRef } from '@ab/web-kit/components/channel/api';
import { ChannelPresenceLine } from '@ab/web-kit/components/channel/presence/ChannelPresenceLine';
import { Avatar } from '@ab/web-kit/components/ui/display/avatar';
import { t } from '@ab/web-kit/lib/i18n/i18n';

const c = t.studentChannel;

interface Props {
  /** The heading ('' = none: the page around it names the chat). */
  title: string;
  pages: readonly ChannelPage[];
  refs: ChannelRef;
  tz: string;
  now: Date;
}

/** At most four names then the viewer; a family sees only its teacher's presence. */
export function ThreadHead({ title, pages, refs, tz, now }: Props) {
  const people = headerPeople({
    participants: pages[0]?.participants ?? [],
    messages: threadMessages(pages),
    you: c.you,
  });
  const face = people.teacher ?? people.others[0];
  return (
    <header className="flex items-center gap-3 border-b border-rule pb-3">
      {face && <Avatar name={face} size="md" decorative />}
      <div className="grid min-w-0 gap-0.5">
        {title && <h2 className="truncate font-display text-h3 font-bold">{title}</h2>}
        {people.line.length > 0 && (
          <p data-testid="channel-people" className="truncate text-xs text-ink-3">
            {people.line.join(c.namesJoin)}
          </p>
        )}
        <ChannelPresenceLine chat={refs} tz={tz} now={now} />
      </div>
    </header>
  );
}
