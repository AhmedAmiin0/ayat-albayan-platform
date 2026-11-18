import { createContext, useContext } from 'react';

/**
 * «القادمة» in the family look (boards PortalWebHome, PortalWebStudentHome): set by the family
 * app around a child's panels. Without it (the staff portal pages) the panel stays as it was.
 */
export interface UpcomingLook {
  /** A student's own page: «حلقتك القادمة», «استعد لحلقتك». */
  own: boolean;
  /** «من تقرير حلقة …» opens that report. */
  openReport: (reportId: string) => void;
}

export const UpcomingLookContext = createContext<UpcomingLook | null>(null);

/** The family look's settings, or null on a staff page. */
export const useUpcomingLook = (): UpcomingLook | null => useContext(UpcomingLookContext);
