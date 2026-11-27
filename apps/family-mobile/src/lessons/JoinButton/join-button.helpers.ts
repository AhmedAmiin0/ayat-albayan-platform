import { t } from '@ab/mobile-kit';

export const idleWord = (short: boolean, live: boolean): string => {
  const card = live ? t.portal.app.live.join : t.portal.join;
  return short ? t.portal.app.lesson.joinShort : card;
};
