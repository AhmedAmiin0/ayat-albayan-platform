import type { PendingView, ShareRequests } from '@ab/web-kit/classroom/share/use-share-requests';

export interface PendingAskProps {
  share: ShareRequests;
  ask: PendingView;
}
