import type { BubbleWord } from '@ab/shared';
import { t } from '../../../lib/i18n/i18n';

export const WORD: Record<BubbleWord, () => string> = {
  failed: () => t.enums.messageStatus.failed,
  unconfirmed: () => t.messages.unconfirmedTick,
  manual: () => t.messages.manualTick,
};
