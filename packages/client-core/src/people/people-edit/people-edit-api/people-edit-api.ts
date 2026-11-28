import { peopleEditRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { PeopleEditCalls } from './people-edit-api.types';

/** The /people edits, moves and switches (R-STU-02, R-STU-04), paths from routes. */
export function peopleEditCalls(client: ApiClient): PeopleEditCalls {
  const call = callWith(client);
  return {
    view: (id) => call({ route: peopleEditRoutes.view, params: { id } }),
    editStudent: (id, body) => call({ route: peopleEditRoutes.editStudent, params: { id }, body }),
    editGuardian: (id, body) =>
      call({ route: peopleEditRoutes.editGuardian, params: { id }, body }),
    removePhone: (params) => call({ route: peopleEditRoutes.removePhone, params }),
    families: (search) => call({ route: peopleEditRoutes.families, query: { search } }),
    move: (id, body) => call({ route: peopleEditRoutes.move, params: { id }, body }),
    contactSelf: (id, body) => call({ route: peopleEditRoutes.contactSelf, params: { id }, body }),
    toStudent: (id) => call({ route: peopleEditRoutes.toStudent, params: { id } }),
    toGuardian: (id) => call({ route: peopleEditRoutes.toGuardian, params: { id } }),
  };
}
