import { defineRoute } from '@ab/core';
import { z } from 'zod';
import {
  shortLinkDetailSchema,
  shortLinkPageSchema,
  shortLinkPersonSchema,
  shortLinkSentDetailSchema,
} from './short-link-views';
import {
  shortCodeSchema,
  shortLinkCreateSchema,
  shortLinkListQuerySchema,
  shortLinkPeopleQuerySchema,
  shortLinkUpdateSchema,
} from './short-links';

const byCode = z.object({ code: shortCodeSchema });
const access = { permissions: ['short_links.manage'], tags: ['short-links'] } as const;

/** The managed short links of the admin and sales (docs/19), written once for api and clients. */
export const shortLinkRoutes = {
  list: defineRoute({
    method: 'GET',
    path: '/short-links',
    query: shortLinkListQuerySchema,
    response: shortLinkPageSchema,
    ...access,
  }),
  people: defineRoute({
    method: 'GET',
    path: '/short-links/people',
    query: shortLinkPeopleQuerySchema,
    response: z.array(shortLinkPersonSchema),
    ...access,
  }),
  create: defineRoute({
    method: 'POST',
    path: '/short-links',
    body: shortLinkCreateSchema,
    response: shortLinkSentDetailSchema,
    ...access,
  }),
  detail: defineRoute({
    method: 'GET',
    path: '/short-links/:code',
    params: byCode,
    response: shortLinkDetailSchema,
    ...access,
  }),
  update: defineRoute({
    method: 'PATCH',
    path: '/short-links/:code',
    params: byCode,
    body: shortLinkUpdateSchema,
    response: shortLinkDetailSchema,
    ...access,
  }),
  revoke: defineRoute({
    method: 'POST',
    path: '/short-links/:code/revoke',
    params: byCode,
    response: shortLinkDetailSchema,
    ...access,
  }),
  resend: defineRoute({
    method: 'POST',
    path: '/short-links/:code/resend',
    params: byCode,
    response: shortLinkSentDetailSchema,
    ...access,
  }),
};
