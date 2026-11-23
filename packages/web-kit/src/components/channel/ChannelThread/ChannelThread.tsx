import type { ChannelAudience } from '@ab/client-core';
import type { ChannelPage } from '@ab/shared';
import { ListSkeleton } from '#/components/ui/index.ts';
import { t } from '#/lib/i18n/index.ts';
import type { ChannelRef } from '#/components/channel/api.ts';
import { ClosedChannel } from '#/components/channel/closed/ClosedChannel.tsx';
import { ChannelLoadFailed } from '#/components/channel/thread/ChannelLoadFailed.tsx';
import { OpenThread } from '#/components/channel/thread/OpenThread.tsx';
import { useChannelThread } from '#/components/channel/thread/use-channel-thread.ts';

const c = t.studentChannel;

/** What the chat is called: the family's «المحادثة مع المعلم/ة», the staff's «رسائل الطلاب». */
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

/**
 * One student's channel (docs/31 §2), shared by the family portal and the staff pages: oldest
 * first under day chips, «الرسائل الأقدم» pages back, the newest message kept in view; live over
 * the socket, polled as the fallback. A participant writes (text, emoji, a photo, a PDF, a voice
 * note, a reply) and marks read (visible tab only) up to the newest message shown; before the
 * subscription and the teacher's assignment (owner 2026-10-29) the card of the steps left. A
 * monitor sees «للاطلاع فقط». The error state only while nothing was read yet.
 */
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
