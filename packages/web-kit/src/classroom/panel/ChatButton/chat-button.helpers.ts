import { t } from '@ab/web-kit/lib/i18n/i18n';

export const chatName = (unread: number): string =>
  unread > 0
    ? t.portal.app.child.chatUnread.replace('{n}', String(unread))
    : t.mobileRoom.controls.chat;
