import { defineRoute, id } from '@ab/core';
import { z } from 'zod';
import { messageViewSchema } from '../../chat/message-view';
import { sendGateViewSchema } from './send-gate.schemas';

const MANAGE = { permissions: ['messages.manage'], tags: ['messaging'] } as const;
const params = z.object({ id: id() });

/** What staff do with an outbound message that did not go out (docs/12 §4, M1 to M3). */
export const messageStatusRoutes = {
  /** Read only, so a teacher's composer shows the same sending-stopped note. */
  gate: defineRoute({
    method: 'GET', path: '/messages/gate', response: sendGateViewSchema,
    permissions: ['messages.read'], tags: ['messaging'],
  }),
  /** M1: failed back to queued; 409 not_retryable, or auto_off for a held row while it is off. */
  retry: defineRoute({
    method: 'POST', path: '/messages/:id/retry', params, response: messageViewSchema, ...MANAGE,
  }),
  /** M2: sent from WhatsApp by hand, so the sender never sends it (R-MSG-03). */
  sentManually: defineRoute({
    method: 'POST', path: '/messages/:id/sent-manually', params,
    response: messageViewSchema, ...MANAGE,
  }),
  /** Held from platform sends for a short window (docs/19); repeating it changes nothing. */
  appSend: defineRoute({
    method: 'POST', path: '/messages/:id/app-send', params, response: messageViewSchema, ...MANAGE,
  }),
  /** M3: staff opened WhatsApp; held until M2 or M1. */
  handOff: defineRoute({
    method: 'POST', path: '/messages/:id/hand-off', params, response: messageViewSchema, ...MANAGE,
  }),
};
