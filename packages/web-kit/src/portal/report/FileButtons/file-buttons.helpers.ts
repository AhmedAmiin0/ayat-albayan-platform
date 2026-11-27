import type { PortalFileKind } from '@ab/client-core';
import type { IconName } from '@ab/web-kit/components/ui/display/icon';
import { t } from '@ab/web-kit/lib/i18n/i18n';

export const LABEL: Record<PortalFileKind, () => string> = {
  reports: () => t.portal.openPdf,
  recordings: () => t.portal.openRecording,
};

/** The report page's buttons carry what they do (board FamRecWebReport): save, or a new tab. */
export const ICON: Record<PortalFileKind, IconName> = {
  reports: 'download',
  recordings: 'external',
};
