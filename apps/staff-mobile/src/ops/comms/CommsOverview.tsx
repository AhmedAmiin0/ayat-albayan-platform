import type { NotificationAudience } from '@ab/shared';
import { LineDrivers } from './LineDrivers';
import { NumbersSummary } from './NumbersSummary';
import { PublicNumber } from './PublicNumber';
import { SendState } from './SendState';
import { WhatIsSent } from './WhatIsSent';

interface CommsOverviewProps {
  onOpenAudience: (audience: NotificationAudience) => void;
  onOpenNumbers: () => void;
}

/** docs/23 §2d, docs/26b §6b: only the provider switch writes, after a confirm (docs/19). */
export function CommsOverview({ onOpenAudience, onOpenNumbers }: CommsOverviewProps) {
  return (
    <>
      <SendState />
      <LineDrivers />
      <NumbersSummary onOpen={onOpenNumbers} />
      <WhatIsSent onOpen={onOpenAudience} />
      <PublicNumber />
    </>
  );
}
