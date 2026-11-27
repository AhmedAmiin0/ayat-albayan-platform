import { salesChatReceiptRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../core/http';
import type { SalesChatReceiptCalls } from './chat-receipts-api.types';

/** The receipt files a student's family sent in its chat, on one api client. */
export function salesChatReceiptCalls(client: ApiClient): SalesChatReceiptCalls {
  const call = callWith(client);
  return {
    list: (query) => call({ route: salesChatReceiptRoutes.list, query }),
    file: ({ messageId, ...query }) =>
      call({ route: salesChatReceiptRoutes.file, params: { messageId }, query }),
  };
}
