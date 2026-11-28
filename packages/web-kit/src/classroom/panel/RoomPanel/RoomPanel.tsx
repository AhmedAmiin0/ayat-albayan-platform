import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { IconButton } from '@ab/web-kit/components/ui/form/IconButton';
import { Dialog } from '@ab/web-kit/components/ui/overlay/dialog';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { PanelBody } from './PanelBody';
import { PanelTabs } from './PanelTabs';
import type { RoomPanelProps } from './RoomPanel.types';
import { useRoomPanel } from './use-room-panel';

export function RoomPanel(props: RoomPanelProps) {
  const { wide, title } = useRoomPanel({ tab: props.tab, count: props.count });
  if (!wide) {
    return (
      <Dialog title={title} onClose={props.onClose} layout="sheet">
        {props.chat && <PanelTabs {...props} />}
        <PanelBody {...props} />
      </Dialog>
    );
  }
  return (
    <aside
      aria-label={title}
      className="flex w-[360px] shrink-0 animate-fade-in flex-col overflow-hidden rounded-md border border-rule bg-card"
    >
      <div className="flex items-center gap-2 border-b border-rule pe-2">
        <PanelTabs {...props} />
        <IconButton label={t.roomFlow.panel.close} onClick={props.onClose}>
          <Icon name="x" />
        </IconButton>
      </div>
      <PanelBody {...props} />
    </aside>
  );
}
