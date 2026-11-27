import { leadFamilyRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../core/http';
import type { LeadFamilyCalls } from './family-link-api.types';

/** A lead's number joins an existing family by its generated code, on one api client. */
export function leadFamilyCalls(client: ApiClient): LeadFamilyCalls {
  const call = callWith(client);
  return {
    link: ({ leadId, code }) =>
      call({ route: leadFamilyRoutes.link, params: { id: leadId }, body: { code } }),
  };
}
