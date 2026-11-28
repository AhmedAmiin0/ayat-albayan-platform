import { t } from '@ab/web-kit/lib/i18n/i18n';
import { RoomButton } from '@ab/web-kit/classroom/room/components/RoomButton';
import type { Props } from './ChatButton.types';
import { chatName } from './chat-button.helpers';
import { UnreadBadge } from './UnreadBadge';

/** The count is part of the button's name. */
export function ChatButton({ unread, on, round, onClick }: Props) {
  const word = t.mobileRoom.controls.chat;
  const name = chatName(unread);
  return (
    <RoomButton
      icon="chat"
      on={on}
      round={round}
      short={word}
      label={word}
      aria-label={name}
      badge={<UnreadBadge key={unread} count={unread} />}
      onClick={onClick}
    />
  );
}
