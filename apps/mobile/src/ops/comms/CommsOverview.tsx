import type { NotificationAudience } from '@ab/shared';
import { NumbersSummary } from './NumbersSummary';
import { PublicNumber } from './PublicNumber';
import { SendState } from './SendState';
import { WhatIsSent } from './WhatIsSent';

export interface CommsOverviewProps {
  /** A «ماذا يُرسل الآن» row: open «الإشعارات» on that audience. */
  onOpenAudience: (audience: NotificationAudience) => void;
  /** «افتح «الأرقام»»: the numbers tab. */
  onOpenNumbers: () => void;
}

/**
 * «نظرة عامة» on the phone (docs/23 §2d mobile, docs/26b §6b): the send state and the server's gate
 * (read-only), the numbers with their health, «ماذا يُرسل الآن» per audience, the number shown to
 * families; where the rest is managed is in the send state's web note. Nothing here writes.
 */
export function CommsOverview({ onOpenAudience, onOpenNumbers }: CommsOverviewProps) {
  return (
    <>
      <SendState />
      <NumbersSummary onOpen={onOpenNumbers} />
      <WhatIsSent onOpen={onOpenAudience} />
      <PublicNumber />
    </>
  );
}
