import type { ProbeAnswer } from '../../../core/http/index.js';

/** What the four apps show: the app, the planned screen or the outage one. */
export type MaintenanceView = 'open' | 'maintenance' | 'down';

/** The last verdict: the admin switch is on, and/or the API stopped answering. */
export interface MaintenanceFacts {
  flag: boolean;
  down: boolean;
}

/** Who looks and where: an admin passes the switch; a running lesson is never covered. */
export interface MaintenanceViewer {
  bypass: boolean;
  inRoom: boolean;
}

/** What a cover draws (web and phone): the view, whether a check is running, «أعد المحاولة». */
export interface MaintenanceState {
  view: MaintenanceView;
  checking: boolean;
  retry: () => void;
}

/** The platform pieces maintenanceFacts asks (web and phone pass their own). */
export interface MaintenanceProbes {
  /** GET <api>/settings/public through probe(). */
  api: () => Promise<ProbeAnswer | null>;
  /** Does the device reach the internet at all? (false: offline never draws a screen). */
  deviceOnline: () => boolean | Promise<boolean>;
  /** The wait before the confirming second ask (MAINTENANCE_CONFIRM_MS). */
  pause: () => Promise<void>;
}
