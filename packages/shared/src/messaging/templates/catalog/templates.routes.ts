import { defineRoute } from '@ab/core';
import { z } from 'zod';
import {
  templateAuthorEditSchema, templateAuthorSchema, templateKeyParam,
} from '../author/template-edit';
import { templateHealthSchema } from '../../schemas';
import { templateCreateSchema } from '../template-create';
import {
  templateHealthViewSchema, templateLineViewSchema,
} from './template-sync.schemas';
import { templateViewSchema } from './template-view.schemas';

const keyParams = z.object({ key: templateKeyParam });
const listSchema = z.array(templateViewSchema);
const MANAGE = { permissions: ['templates.manage'], tags: ['messaging'] } as const;
const AUTHOR = { permissions: ['templates.author'], tags: ['messaging'] } as const;

/** Sales authoring: never a templates.manage route, never past the allow-list. */
export const authoredTemplateRoutes = {
  /** The chat allow-list and the author's own templates, every status with Meta's reason. */
  list: defineRoute({
    method: 'GET', path: '/messaging/templates/authored', response: listSchema, ...AUTHOR,
  }),
  /** Straight to Meta on the chat line; 429 author_daily_limit. */
  create: defineRoute({
    method: 'POST', path: '/messaging/templates/authored', body: templateAuthorSchema,
    response: templateViewSchema, ...AUTHOR,
  }),
  /** 403 not_author_editable off the allow-list; Meta's edit rules answer 409. */
  edit: defineRoute({
    method: 'PATCH', path: '/messaging/templates/authored/:key', params: keyParams,
    body: templateAuthorEditSchema, response: templateViewSchema, ...AUTHOR,
  }),
};

/**
 * T1–T3 (docs/12 §4): the registry and its health per number (R-MSG-01). Every route but the list
 * is a template manager's, never a role based on sales, the classroom assistant or teacher.
 */
export const templateCatalogRoutes = {
  /** Every template, or only the restricted allow-list for a role that may not send them all. */
  list: defineRoute({
    method: 'GET', path: '/messaging/templates', response: listSchema,
    permissions: ['messages.read'], tags: ['messaging'],
  }),
  /** An unsubmitted row; 409 invalid_template or template_exists. */
  create: defineRoute({
    method: 'POST', path: '/messaging/templates', body: templateCreateSchema,
    response: templateViewSchema, ...MANAGE,
  }),
  /** Each number's driver, WABA and phone ids (env only, no Meta call) and its last sync. */
  lines: defineRoute({
    method: 'GET', path: '/messaging/templates/lines', response: z.array(templateLineViewSchema),
    ...MANAGE,
  }),
  /** One line (body, else query) or every configured line; 503 not_configured. */
  health: defineRoute({
    method: 'POST', path: '/messaging/templates/health', body: templateHealthSchema.optional(),
    query: templateHealthSchema, response: templateHealthViewSchema, ...MANAGE,
  }),
};
