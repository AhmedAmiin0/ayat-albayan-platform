import { t } from '#/lib/i18n/index.ts';
import { RoomButton } from '#/classroom/room/components/RoomButton.tsx';

interface Props {
  unread: number;
  /** The panel shows the chat now. */
  on: boolean;
  round: boolean;
  onClick: () => void;
}

/**
 * «المحادثة» with its unread count (the app's ChatButton): the badge pops in again each time the
 * count changes (a new message arrived), and the count is part of the button's name.
 */
export function ChatButton({ unread, on, round, onClick }: Props) {
  const word = t.mobileRoom.controls.chat;
  const name = unread > 0 ? t.portal.app.child.chatUnread.replace('{n}', String(unread)) : word;
  const badge = unread > 0 && (
    <span
      key={unread}
      aria-hidden="true"
      className="absolute -top-1.5 -end-1.5 grid min-w-5 animate-pop-in place-items-center rounded-full bg-primary px-1 text-[11px] font-bold leading-5 text-primary-foreground tabular-nums"
    >
      {unread}
    </span>
  );
  return (
    <RoomButton
      icon="chat"
      on={on}
      round={round}
      short={word}
      label={word}
      aria-label={name}
      badge={badge}
      onClick={onClick}
    />
  );
}
