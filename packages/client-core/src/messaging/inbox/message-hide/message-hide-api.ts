import { messageHideRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { MessageHideCalls } from './message-hide-api.types';

/** Hiding a WhatsApp message from the platform, and showing it again, on one api client. */
export function messageHideCalls(client: ApiClient): MessageHideCalls {
  const call = callWith(client);
  return {
    hide: (params) => call({ route: messageHideRoutes.hide, params }),
    unhide: (params) => call({ route: messageHideRoutes.unhide, params }),
  };
}
