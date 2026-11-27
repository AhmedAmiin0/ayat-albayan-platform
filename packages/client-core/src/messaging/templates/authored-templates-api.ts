import { authoredTemplateRoutes, templateViewSchema } from '@ab/shared';
import { callWith, type ApiClient } from '../../core/http';
import type { AuthoredTemplateCalls } from './templates-api';

const AUTHORED = '/messaging/templates/authored';

/** A template author's own list and writes (templates.author). */
export function authoredTemplateCalls(client: ApiClient): AuthoredTemplateCalls {
  const call = callWith(client);
  return {
    list: () => call({ route: authoredTemplateRoutes.list }),
    create: (body) => call({ route: authoredTemplateRoutes.create, body }),
    edit: ({ key, input }) => call({
      method: 'PATCH', path: `${AUTHORED}/${encodeURIComponent(key)}`, body: input,
      schema: templateViewSchema,
    }),
  };
}
