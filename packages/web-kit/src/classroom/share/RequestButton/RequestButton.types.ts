import type { RequestKind } from '@ab/web-kit/classroom/share/share-messages';
import type { ShareRequests } from '@ab/web-kit/classroom/share/use-share-requests';

export interface RequestButtonProps {
  share: ShareRequests;
  what: RequestKind;
}
