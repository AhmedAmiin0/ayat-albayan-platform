import { defineRoute, id, phoneE164 } from '@ab/core';
import { z } from 'zod';
import { messageViewSchema } from '../chat/message-view';
import {
  acceptCallSchema,
  callListQuerySchema,
  callPermissionRequestSchema,
  startCallSchema,
} from './call-schemas';
import {
  activeCallViewSchema,
  callConfigViewSchema,
  callPermissionViewSchema,
  callViewSchema,
} from './call-views.schemas';

const read = { permissions: ['inbox.read'], tags: ['calls'] } as const;
const send = { permissions: ['inbox.send'], tags: ['calls'] } as const;
const byId = z.object({ id: id() });
const byPhone = z.object({ phone: phoneE164 });

/**
 * WhatsApp voice calls (docs/28 §4), the scopes of a send from the thread. While
 * whatsapp_calls_enabled is off every route but the config answers 404 calls_disabled.
 */
export const callsRoutes = {
  /** 200; always answers, the ICE servers only to a caller with inbox.send. */
  config: defineRoute({
    method: 'GET',
    path: '/calls/config',
    response: callConfigViewSchema,
    ...read,
  }),
  /** 200; the caller's own live call and the inbound ones ringing in chats they may answer. */
  active: defineRoute({
    method: 'GET',
    path: '/calls/active',
    response: z.array(activeCallViewSchema),
    ...read,
  }),
  /** 200; the log, newest first, or one chat's; the caller's scope is checked before the query. */
  list: defineRoute({
    method: 'GET',
    path: '/calls',
    query: callListQuerySchema,
    response: z.array(callViewSchema),
    ...read,
  }),
  /** 201; a repeated clientRequestId answers the first call, never a second connect. */
  start: defineRoute({
    method: 'POST',
    path: '/calls',
    body: startCallSchema,
    response: activeCallViewSchema,
    ...send,
  }),
  /** 200; this device answers the family's offer. */
  accept: defineRoute({
    method: 'POST',
    path: '/calls/:id/accept',
    params: byId,
    body: acceptCallSchema,
    response: activeCallViewSchema,
    ...send,
  }),
  /** 200; staff decline an inbound call. */
  reject: defineRoute({
    method: 'POST',
    path: '/calls/:id/reject',
    params: byId,
    response: activeCallViewSchema,
    ...send,
  }),
  /** 200; hangs up the caller's own call. */
  end: defineRoute({
    method: 'POST',
    path: '/calls/:id/end',
    params: byId,
    response: activeCallViewSchema,
    ...send,
  }),
  /** 200; may this number be called now; 400 invalid_phone. */
  permission: defineRoute({
    method: 'GET',
    path: '/calls/permission/:phone',
    params: byPhone,
    response: callPermissionViewSchema,
    ...send,
  }),
  /** 201; the ask goes out through the outbox, a repeated clientRequestId answers the first. */
  permissionRequest: defineRoute({
    method: 'POST',
    path: '/calls/permission/:phone/request',
    params: byPhone,
    body: callPermissionRequestSchema,
    response: messageViewSchema,
    ...send,
  }),
};
