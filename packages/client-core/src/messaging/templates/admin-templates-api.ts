import { templateViewSchema } from '@ab/shared';
import { z } from 'zod';
import { callWith, type ApiClient } from '../../core/http';
import type { AdminTemplateCalls } from './templates-api.types';

const ALL = '/messaging/templates';
const listSchema = z.array(templateViewSchema);

/** The template registry for any reader, and a template manager's edit of its words. */
export function adminTemplateCalls(client: ApiClient): AdminTemplateCalls {
  const call = callWith(client);
  return {
    list: () => call({ path: ALL, schema: listSchema }),
    editContent: ({ key, input }) => call({
      method: 'PATCH', path: `${ALL}/${encodeURIComponent(key)}/content`, body: input,
      schema: templateViewSchema,
    }),
  };
}
