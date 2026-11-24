import type { ChannelAudience } from '@ab/client-core';
import type { ChannelPage } from '@ab/shared';
import { ListSkeleton } from '@ab/web-kit/components/ui/display/skeleton';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { ChannelRef } from '@ab/web-kit/components/channel/api';
import { ClosedChannel } from '@ab/web-kit/components/channel/closed/ClosedChannel';
import { ChannelLoadFailed } from '@ab/web-kit/components/channel/thread/ChannelLoadFailed';
import { OpenThread } from '@ab/web-kit/components/channel/thread/OpenThread';
import { useChannelThread } from '@ab/web-kit/components/channel/thread/use-channel-thread';

const c = t.studentChannel;

const TITLES: Readonly<Record<ChannelAudience, string>> = {
  portal: c.portalTab,
  teacher: c.title,
  sales: c.title,
  admin: c.title,
};

/**
 * The section's accessible name, and the heading above it ('' = none) from the newest page: the
 * student's name on the staff pages that ask for it, the family's full title on the child's tab.
 */
function threadHead(audience: ChannelAudience, first: ChannelPage | undefined, named: boolean) {
  const name = first?.student_name ?? '';
  const label = name ? `${TITLES[audience]} · ${name}` : TITLES[audience];
  const family = audience === 'portal' ? label : '';
  return { label, heading: named ? name : family };
}

interface Props {
  refs: ChannelRef;
  tz: string;
  /** The student's name above the thread (the teacher's page, where nothing else names it). */
  named?: boolean;
}

/** docs/31 §2; live over the socket with polling fallback; reads only in a visible tab. */
export function ChannelThread({ refs, tz, named = false }: Props) {
  const thread = useChannelThread(refs);
  const { query, first, mode } = thread;
  const data = query.data;
  if (query.isPending) return <ListSkeleton />;
  if (!data) return <ChannelLoadFailed onRetry={() => void query.refetch()} />;
  const head = threadHead(refs.audience, first, named);
  if (mode === 'closed') {
    return <ClosedChannel label={head.label} name={head.heading} reason={first?.closed_reason} />;
  }
  return <OpenThread {...{ refs, tz, head, pages: data.pages }} thread={{ ...thread, mode }} />;
}
