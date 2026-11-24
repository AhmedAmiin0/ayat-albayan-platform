import { headerPeople, threadMessages, type ChannelAudience } from '@ab/client-core';
import type { ChannelPage, ChannelParticipantView } from '@ab/shared';
import type { ReactNode } from 'react';
import { t } from '../lib/i18n/i18n';
import { Screen } from '../ui/layout/Screen';
import { ChannelThread } from './ChannelThread';
import { useChannel, type ChannelRef } from './channel-api';
import { ChannelHeader } from './header/ChannelHeader';
import type { ChannelMediaPort } from './media-port';

interface ChannelScreenProps {
  refs: ChannelRef;
  /** The app's own name for the chat, before the student's; absent → the student's name. */
  title?: string;
  /** The app's picker, recorder and player; absent → text only. */
  media?: ChannelMediaPort;
  banner?: ReactNode;
  trailing?: ReactNode;
}

/** The family sees who they talk to (the first teacher); staff see the student. */
const AVATAR: Readonly<Record<ChannelAudience, 'people' | 'student'>> = {
  portal: 'people',
  teacher: 'student',
  admin: 'student',
  sales: 'student',
};

const titleOf = (title: string | undefined, student: string): string =>
  [title, student].filter(Boolean).join(' · ');

/** The newest page's members (an older API's and a loading page's: none). */
const participantsOf = (pages: readonly ChannelPage[] | undefined): ChannelParticipantView[] =>
  pages?.[0]?.participants ?? [];

/**
 * A student channel screen (docs/31 §2), the same in both apps: the head (avatar, title, the
 * people, presence), then the thread. The app reads the student from its route.
 */
export function ChannelScreen({ refs, title, media, banner, trailing }: ChannelScreenProps) {
  // The same query the thread reads (one request): it names the student and the people.
  const pages = useChannel(refs).data?.pages;
  const student = pages?.[0]?.student_name ?? '';
  const { others, line, teacher } = headerPeople({
    participants: participantsOf(pages),
    messages: threadMessages(pages),
    you: t.studentChannel.you,
  });
  const avatar = AVATAR[refs.audience] === 'people' ? (teacher ?? others[0] ?? student) : student;
  return (
    <Screen chat>
      <ChannelHeader
        refs={refs}
        title={titleOf(title, student)}
        avatarName={avatar}
        names={line.join(t.studentChannel.namesJoin)}
        trailing={trailing}
      />
      {banner}
      <ChannelThread refs={refs} media={media} />
    </Screen>
  );
}
