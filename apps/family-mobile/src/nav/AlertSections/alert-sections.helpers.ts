import type { AlertGroup } from '@ab/client-core';
import { t } from '@ab/mobile-kit';

export const GROUP: Record<AlertGroup, () => string> = {
  today: () => t.portal.app.alerts.today,
  yesterday: () => t.portal.app.alerts.yesterday,
  week: () => t.portal.app.alerts.week,
  older: () => t.portal.app.alerts.older,
};
