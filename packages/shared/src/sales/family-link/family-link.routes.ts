import { defineRoute, id } from '@ab/core';
import { z } from 'zod';
import { leadFamilyLinkedSchema, leadFamilyLinkSchema } from './family-link.schemas';

/** A lead's number becomes the second number of an existing family, by its generated code. */
export const leadFamilyRoutes = {
  link: defineRoute({
    permissions: ['leads.link_family'],
    tags: ['leads'],
    method: 'POST',
    path: '/leads/:id/link-family',
    params: z.object({ id: id() }),
    body: leadFamilyLinkSchema,
    response: leadFamilyLinkedSchema,
  }),
};
