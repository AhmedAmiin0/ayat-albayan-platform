import { availabilityRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { AvailabilityCalls } from './availability-api.types';

/** A teacher's weekly grid and time-off (R-TCH-02) on one api client, paths from routes. */
export function availabilityCalls(client: ApiClient): AvailabilityCalls {
  const call = callWith(client);
  return {
    grid: (id) => call({ route: availabilityRoutes.grid, params: { id } }),
    replaceGrid: (id, body) =>
      call({ route: availabilityRoutes.replaceGrid, params: { id }, body }),
    timeOff: (id) => call({ route: availabilityRoutes.timeOff, params: { id } }),
    addTimeOff: (id, body) => call({ route: availabilityRoutes.addTimeOff, params: { id }, body }),
    removeTimeOff: (params) => call({ route: availabilityRoutes.removeTimeOff, params }),
  };
}
