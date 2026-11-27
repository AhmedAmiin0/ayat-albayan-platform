import { googleMapRoutes } from '@ab/catalog';
import { callWith, type ApiClient } from '../../core/http';
import type { GoogleMapCalls } from './google-map-api.types';

/** The teacher calendar and student folder mappings of the admin, on one api client. */
export function googleMapCalls(client: ApiClient): GoogleMapCalls {
  const call = callWith(client);
  return {
    teachers: () => call({ route: googleMapRoutes.teachers }),
    setTeacher: (params, body) => call({ route: googleMapRoutes.setTeacher, params, body }),
    calendarOwner: (params) => call({ route: googleMapRoutes.calendarOwner, params }),
    setCalendarOwner: (params, body) =>
      call({ route: googleMapRoutes.setCalendarOwner, params, body }),
    students: (query) => call({ route: googleMapRoutes.students, query }),
    setStudent: (params, body) => call({ route: googleMapRoutes.setStudent, params, body }),
    unsetStudent: (params) => call({ route: googleMapRoutes.unsetStudent, params }),
  };
}
