import type { ApiClient } from '../../../core/http';
import { pathKey } from '../../../core/keys';
import { adminTemplateCalls } from '../admin-templates-api';
import { authoredTemplateCalls } from '../authored-templates-api';
import type { TemplateListMode, TemplateQueries } from './templates-api.types';

const ALL = '/messaging/templates';

/** Every template query sits under this key: one invalidation refreshes lists and pickers. */
export const TEMPLATES_KEY = pathKey(ALL);

const LIST_KEYS: Record<TemplateListMode, string[]> = {
  admin: TEMPLATES_KEY,
  author: pathKey(`${ALL}/authored`),
};

export function templateQueries(client: ApiClient): TemplateQueries {
  const lists = {
    admin: adminTemplateCalls(client).list,
    author: authoredTemplateCalls(client).list,
  };
  return {
    templateListQuery: (mode) => ({ queryKey: LIST_KEYS[mode], queryFn: lists[mode] }),
  };
}
