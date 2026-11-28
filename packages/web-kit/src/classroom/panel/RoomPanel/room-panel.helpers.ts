import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { PanelTab } from './RoomPanel.types';

export const tabWord = (tab: PanelTab, count: number): string =>
  tab === 'chat'
    ? t.mobileRoom.controls.chat
    : t.roomFlow.panel.people.replace('{n}', String(count));
