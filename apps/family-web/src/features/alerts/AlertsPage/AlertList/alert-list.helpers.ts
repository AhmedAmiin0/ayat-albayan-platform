import type { AlertGroup } from '@ab/client-core';
import { t } from '@ab/web-kit';

export const GROUP_TITLE: Readonly<Record<AlertGroup, () => string>> = {
  today: () => t.portal.app.alerts.today,
  yesterday: () => t.portal.app.alerts.yesterday,
  week: () => t.portal.app.alerts.week,
  older: () => t.portal.app.alerts.older,
};
