import type { RoomNoticeProps } from '../RoomNotice.types';

export type NoticeActionsProps = Pick<RoomNoticeProps, 'again' | 'browser' | 'onBack'>;
