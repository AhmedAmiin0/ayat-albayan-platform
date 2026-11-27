import { defineRoute } from '@ab/core';
import { lineCheckResponseSchema } from './line-check.schemas';

/** Line diagnostics: each WhatsApp line as its provider reports it now. */
export const lineCheckRoutes = {
  /** 200; template managers; an unconfigured line makes no request. */
  check: defineRoute({
    method: 'POST',
    path: '/messaging/lines/check',
    response: lineCheckResponseSchema,
  }),
};
