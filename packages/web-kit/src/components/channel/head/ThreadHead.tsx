import { headerPeople, threadMessages } from '@ab/client-core';
import type { ChannelPage } from '@ab/shared';
import type { ChannelRef } from '#/components/channel/api.ts';
import { ChannelPresenceLine } from '#/components/channel/presence/ChannelPresenceLine.tsx';
import { Avatar } from '#/components/ui/display/index.ts';
import { t } from '#/lib/i18n/index.ts';

const c = t.studentChannel;

interface Props {
  /** The heading ('' = none: the page around it names the chat). */
  title: string;
  pages: readonly ChannelPage[];
  refs: ChannelRef;
  tz: string;
  now: Date;
}

/**
 * The chat's head (FamChatWebThread): the first teacher's initials, the title, the people line
 * «أ. فاطمة، سارة، يوسف خالد، أنت» (at most four names, then «أنت») and the presence line (a family
 * sees only its teacher's). A viewer with nobody else known yet sees the presence line alone.
 */
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
