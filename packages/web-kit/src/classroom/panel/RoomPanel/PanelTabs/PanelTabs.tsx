import { cn } from '@ab/web-kit/lib/utils';
import type { RoomPanelProps } from '@ab/web-kit/classroom/panel/RoomPanel/RoomPanel.types';
import { tabWord } from '@ab/web-kit/classroom/panel/RoomPanel/room-panel.helpers';
import { tabsOf } from './panel-tabs.helpers';

export function PanelTabs({ tab, onTab, chat, count }: RoomPanelProps) {
  const tabs = tabsOf(chat);
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
