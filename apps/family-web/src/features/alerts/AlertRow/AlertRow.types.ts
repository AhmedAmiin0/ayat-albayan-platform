import type { PortalKind } from '@ab/shared';
import type { FamilyAlerts } from '@/features/alerts/alerts-api';

export interface Props {
  alert: FamilyAlerts['items'][number];
  kind: PortalKind;
  tz: string;
  onRead: (id: string) => void;
}
