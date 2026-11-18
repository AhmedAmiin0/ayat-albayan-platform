import type { ChannelPage } from '@ab/shared';
import { ListSkeleton } from '@ab/web-kit/components/ui/display/skeleton';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { ChannelRef } from './api';
import { ChannelLoadFailed } from './thread/ChannelLoadFailed';
import { ClosedChannel } from './thread/ClosedChannel';
import { OpenThread } from './thread/OpenThread';
import { useChannelThread } from './thread/use-channel-thread';

const c = t.studentChannel;

/** The section's accessible name and the heading above it ('' = none) from the newest page. */
function threadHead(first: ChannelPage | undefined, named: boolean) {
  const name = first?.student_name ?? '';
  return { label: name ? `${c.title} · ${name}` : c.title, heading: named ? name : '' };
}

interface Props {
  refs: ChannelRef;
  tz: string;
  /** The student's name above the thread (the teacher's page, where nothing else names it). */
  named?: boolean;
}

/**
 * One student's channel (docs/31 §2): oldest first, «الرسائل الأقدم» pages back, the newest
 * message kept in view; live over the socket, polled as the fallback. A participant writes and
 * marks read (visible tab only) up to the newest message shown; before the subscription and the
 * teacher's assignment (owner 2026-10-29) only the closed line of its reason. A monitor sees
 * «للاطلاع فقط». The error state only while nothing was read yet.
 */
export function ChannelThread({ refs, tz, named = false }: Props) {
  const thread = useChannelThread(refs);
  const { query, first, mode } = thread;
  const data = query.data;
  if (query.isPending) return <ListSkeleton />;
  if (!data) return <ChannelLoadFailed onRetry={() => void query.refetch()} />;
  const head = threadHead(first, named);
  if (mode === 'closed') {
    return <ClosedChannel label={head.label} name={head.heading} reason={first?.closed_reason} />;
  }
  return <OpenThread {...{ refs, tz, head, pages: data.pages }} thread={{ ...thread, mode }} />;
}
