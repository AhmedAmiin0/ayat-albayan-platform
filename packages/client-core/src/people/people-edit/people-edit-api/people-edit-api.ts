import { peopleEditRoutes as routes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { PeopleEditCalls } from './people-edit-api.types';

/** The /people edits, moves and switches (R-STU-02, R-STU-04), paths from routes. */
export function peopleEditCalls(client: ApiClient): PeopleEditCalls {
  const call = callWith(client);
  return {
    view: (id) => call({ route: routes.view, params: { id } }),
    editStudent: (id, body) => call({ route: routes.editStudent, params: { id }, body }),
    editGuardian: (id, body) => call({ route: routes.editGuardian, params: { id }, body }),
    removePhone: (params) => call({ route: routes.removePhone, params }),
    families: (search) => call({ route: routes.families, query: { search } }),
    move: (id, body) => call({ route: routes.move, params: { id }, body }),
    contactSelf: (id, body) => call({ route: routes.contactSelf, params: { id }, body }),
    toStudent: (id) => call({ route: routes.toStudent, params: { id } }),
    toGuardian: (id) => call({ route: routes.toGuardian, params: { id } }),
  };
}
