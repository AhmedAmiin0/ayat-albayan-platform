import type { PortalPackage } from '@ab/shared';
import { t } from '@ab/mobile-kit';
import { dayDate } from '@/package/package-text';

/** The renewal date is shown only when known. */
export const factsOf = (pkg: PortalPackage) => [
  { label: t.portal.app.package.start, value: dayDate(pkg.starts_on) },
  ...(pkg.renews_on
    ? [{ label: t.portal.app.package.renewal, value: dayDate(pkg.renews_on) }]
    : []),
];
