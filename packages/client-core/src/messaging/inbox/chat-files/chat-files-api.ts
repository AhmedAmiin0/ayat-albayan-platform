import { chatFileRoutes, chatMediaRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { ChatFileCalls } from './chat-files-api.types';

/** A chat's files on one api client, staff only; every answer parsed strictly. */
export function chatFileCalls(client: ApiClient): ChatFileCalls {
  const call = callWith(client);
  return {
    file: (params) => call({ route: chatFileRoutes.file, params, query: {} }),
    download: (params) => call({ route: chatFileRoutes.file, params, query: { download: '1' } }),
    pdfPage: (params) => call({ route: chatFileRoutes.pdfPage, params }),
    media: (params) => call({ route: chatMediaRoutes.list, params }),
    mediaFile: (params) => call({ route: chatMediaRoutes.file, params }),
  };
}
