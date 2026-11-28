import { numberTemplatesRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { NumberTemplateCalls } from './number-templates-api.types';

/** A number's template approvals, for template managers. */
export function numberTemplateCalls(client: ApiClient): NumberTemplateCalls {
  const call = callWith(client);
  return {
    sync: (id) => call({ route: numberTemplatesRoutes.sync, params: { id } }),
  };
}
