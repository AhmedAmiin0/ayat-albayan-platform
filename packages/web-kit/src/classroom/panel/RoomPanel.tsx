import type { ReactNode } from 'react';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { IconButton } from '@ab/web-kit/components/ui/form/icon-button';
import { Dialog } from '@ab/web-kit/components/ui/overlay/dialog';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { cn } from '@ab/web-kit/lib/utils';
import type { RoomChatSlot } from '@ab/web-kit/classroom/flow/room-kit';
import { useWideRoom } from './use-wide-room';

export type PanelTab = 'chat' | 'people';

export interface RoomPanelProps {
  tab: PanelTab;
  onTab: (tab: PanelTab) => void;
  onClose: () => void;
  /** The family's chat; none shows the people only. */
  chat: RoomChatSlot | null;
  people: ReactNode;
  count: number;
}

const tabWord = (tab: PanelTab, count: number): string =>
  tab === 'chat' ? t.mobileRoom.controls.chat : t.roomFlow.panel.people.replace('{n}', String(count));

function Tabs({ tab, onTab, chat, count }: RoomPanelProps) {
  const tabs: PanelTab[] = chat ? ['chat', 'people'] : ['people'];
  return (
    <div role="tablist" className="flex min-w-0 flex-1 gap-1">
      {tabs.map((x) => (
        <button
          key={x}
          type="button"
          role="tab"
          aria-selected={tab === x}
          onClick={() => onTab(x)}
          className={cn(
            'ab-press min-h-11 border-b-2 px-3 text-sm font-semibold transition-colors duration-(--duration-quick)',
            tab === x ? 'border-lapis text-lapis' : 'border-transparent text-ink-2',
          )}
        >
          {tabWord(x, count)}
        </button>
      ))}
    </div>
  );
}

/**
 * The chat's scroller. The thread keeps its newest message in view by scrolling an end marker in;
 * the gap (the kit thread's --chat-end-gap) leaves its composer under it in view too, so the reply
 * box is never below the panel's fold.
 */
const CHAT_BODY =
  'flex min-h-[50dvh] flex-1 flex-col overflow-y-auto [--chat-end-gap:7.5rem] lg:min-h-0';

function Body({ tab, chat, people }: RoomPanelProps) {
  if (tab === 'people' || !chat) return <div className="min-h-0 flex-1 overflow-y-auto">{people}</div>;
  if (chat.locked) return <p className="p-4 text-sm text-ink-2">{t.studentChannel.closed}</p>;
  return <div className={CHAT_BODY}>{chat.body}</div>;
}

export function RoomPanel(props: RoomPanelProps) {
  const wide = useWideRoom();
  if (!wide) {
    return (
      <Dialog title={tabWord(props.tab, props.count)} onClose={props.onClose} layout="sheet">
        {props.chat && <Tabs {...props} />}
        <Body {...props} />
      </Dialog>
    );
  }
  return (
    <aside
      aria-label={tabWord(props.tab, props.count)}
      className="flex w-[360px] shrink-0 animate-fade-in flex-col overflow-hidden rounded-md border border-rule bg-card"
    >
      <div className="flex items-center gap-2 border-b border-rule pe-2">
        <Tabs {...props} />
        <IconButton label={t.roomFlow.panel.close} onClick={props.onClose}>
          <Icon name="x" />
        </IconButton>
      </div>
      <Body {...props} />
    </aside>
  );
}
