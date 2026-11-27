import { defineRoute } from '@ab/core';
import { z } from 'zod';
import {
  templateAuthorEditSchema, templateAuthorSchema, templateKeyParam,
} from '../author/template-edit';
import { templateViewSchema } from './template-view.schemas';

const keyParams = z.object({ key: templateKeyParam });
const listSchema = z.array(templateViewSchema);
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
