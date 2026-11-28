import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { RoomPanelProps } from '@ab/web-kit/classroom/panel/RoomPanel/RoomPanel.types';
import { CHAT_BODY } from './panel-body.helpers';

export function PanelBody({ tab, chat, people }: RoomPanelProps) {
  if (tab === 'people' || !chat)
    return <div className="min-h-0 flex-1 overflow-y-auto">{people}</div>;
  if (chat.locked) return <p className="p-4 text-sm text-ink-2">{t.studentChannel.closed}</p>;
  return <div className={CHAT_BODY}>{chat.body}</div>;
}
