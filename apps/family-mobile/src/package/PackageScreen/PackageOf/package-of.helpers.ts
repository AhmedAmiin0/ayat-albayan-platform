import { portalViewer, seesMoney } from '@ab/client-core';
import type { PortalHome, PortalStudent } from '@ab/shared';

export const seesPackage = (me: PortalHome, student: PortalStudent): boolean =>
  seesMoney(portalViewer(me.kind, student));
