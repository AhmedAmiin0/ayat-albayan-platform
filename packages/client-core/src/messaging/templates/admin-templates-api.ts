import { templateCatalogRoutes, templateViewSchema } from '@ab/shared';
import { callWith, type ApiClient } from '../../core/http';
import type { AdminTemplateCalls } from './templates-api';

const ALL = '/messaging/templates';

/** The template registry for any reader, and a template manager's catalog and edits. */
export function adminTemplateCalls(client: ApiClient): AdminTemplateCalls {
  const call = callWith(client);
  return {
    list: () => call({ route: templateCatalogRoutes.list }),
    create: (body) => call({ route: templateCatalogRoutes.create, body }),
    lines: () => call({ route: templateCatalogRoutes.lines }),
    health: (body) => call({ route: templateCatalogRoutes.health, body, query: {} }),
    editContent: ({ key, input }) => call({
      method: 'PATCH', path: `${ALL}/${encodeURIComponent(key)}/content`, body: input,
      schema: templateViewSchema,
    }),
  };
}
