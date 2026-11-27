import type { PortalKind } from '@ab/shared';
import type { FamilyAlerts } from '@/features/alerts/alerts-api';

export interface AlertListProps {
  page: FamilyAlerts;
  kind: PortalKind;
  onRead: (id: string) => void;
}
