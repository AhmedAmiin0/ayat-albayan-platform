import { defineRoute } from '@ab/core';
import { z } from 'zod';
import { templateEditSchema, templateKeyParam } from '../author/template-edit';
import { templateCrmNameSchema } from '../../chat/crm-names';
import {
  templateCrmStatusSchema, templateLineSchema, templateStarterSchema,
} from '../../schemas';
import { templateNumberSchema, templateNumberSetViewSchema } from '../template-number';
import { templateMoveViewSchema } from './template-sync.schemas';
import { templateViewSchema } from './template-view.schemas';

const PATH = '/messaging/templates/:key';
/** Only the content edit checks the key's form; the others answer an unknown key themselves. */
const editedKey = z.object({ key: templateKeyParam });
const anyKey = z.object({ key: z.string() });
const MANAGE = { permissions: ['templates.manage'], tags: ['messaging'] } as const;

/** The edits of one template (docs/12 §4, R-MSG-01): a template manager's, every one audited. */
export const templateEditRoutes = {
  /** Meta's edit rules; a template the code sends allows word changes only. */
  content: defineRoute({
    method: 'PATCH', path: `${PATH}/content`, params: editedKey, body: templateEditSchema,
    response: templateViewSchema, ...MANAGE,
  }),
  /** The only way a template reaches Meta, on the WABA of its own number. */
  submit: defineRoute({
    method: 'POST', path: `${PATH}/submit`, params: anyKey, response: templateViewSchema,
    ...MANAGE,
  }),
  /** To the other number, then that number's sync. */
  line: defineRoute({
    method: 'PATCH', path: `${PATH}/line`, params: anyKey, body: templateLineSchema,
    response: templateMoveViewSchema, ...MANAGE,
  }),
  /** docs/23c decision 9: null is the role's default; a warning, never a refusal. */
  number: defineRoute({
    method: 'PUT', path: `${PATH}/number`, params: anyKey, body: templateNumberSchema,
    response: templateNumberSetViewSchema, ...MANAGE,
  }),
  /** Crm line only (docs/19), set by hand; 409 not_crm_line. */
  crmStatus: defineRoute({
    method: 'PUT', path: `${PATH}/crm-status`, params: anyKey, body: templateCrmStatusSchema,
    response: templateViewSchema, ...MANAGE,
  }),
  /** docs/19: blank is the default; any line. */
  crmName: defineRoute({
    method: 'PUT', path: `${PATH}/crm-name`, params: anyKey, body: templateCrmNameSchema,
    response: templateViewSchema, ...MANAGE,
  }),
  /** The restricted allow-list that teachers, sales and limited roles may send (docs/16). */
  starter: defineRoute({
    method: 'PATCH', path: `${PATH}/starter`, params: anyKey, body: templateStarterSchema,
    response: templateViewSchema, ...MANAGE,
  }),
};
