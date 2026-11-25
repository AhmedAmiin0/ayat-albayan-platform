import type { TemplateAuthorInput, TemplateEditInput } from '@ab/shared';
import type { ApiClient } from '../../core/http';
import { pathKey } from '../../core/keys';
import { templateListSchema, templateViewSchema, type AuthorTemplate } from './template-view';

// Authors use /authored; the admin (templates.manage) edits any template via /:key/content.

const ALL = '/messaging/templates';
const AUTHORED = `${ALL}/authored`;
const enc = encodeURIComponent;

/** Every template query sits under this key: one invalidation refreshes lists and pickers. */
export const TEMPLATES_KEY = pathKey(ALL);

export type TemplateListMode = 'admin' | 'author';

const PATHS: Record<TemplateListMode, string> = { admin: ALL, author: AUTHORED };

export interface TemplateListQuery {
  queryKey: string[];
  queryFn: () => Promise<AuthorTemplate[]>;
}

export interface TemplateQueries {
  /** The admin's registry, or the author's allow-list and own templates (every status). */
  templateListQuery: (mode: TemplateListMode) => TemplateListQuery;
}

export function templateQueries(client: ApiClient): TemplateQueries {
  return {
    templateListQuery: (mode) => ({
      queryKey: pathKey(PATHS[mode]),
      queryFn: async () => templateListSchema.parse(await client.apiFetch(PATHS[mode])),
    }),
  };
}

export interface TemplateEditCall {
  key: string;
  input: TemplateEditInput;
}

type Send<I> = (input: I) => Promise<AuthorTemplate>;

export interface TemplateSends {
  /** A new sales template: straight to Meta on the chat line (429 author_daily_limit). */
  createAuthored: Send<TemplateAuthorInput>;
  /** An author's edit of an allow-list template the code does not send. */
  editAuthored: Send<TemplateEditCall>;
  editContent: Send<TemplateEditCall>;
}

export function templateSends(client: ApiClient): TemplateSends {
  const send = (method: 'POST' | 'PATCH', path: string, body: unknown) =>
    client.apiSend(method, path, body).then((r: unknown) => templateViewSchema.parse(r));
  return {
    createAuthored: (input) => send('POST', AUTHORED, input),
    editAuthored: ({ key, input }) => send('PATCH', `${AUTHORED}/${enc(key)}`, input),
    editContent: ({ key, input }) => send('PATCH', `${ALL}/${enc(key)}/content`, input),
  };
}
