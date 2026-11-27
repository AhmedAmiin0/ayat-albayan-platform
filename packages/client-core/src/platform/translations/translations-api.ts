import { translationRoutes } from '@ab/i18n';
import { callWith, type ApiClient } from '../../core/http';
import type { TranslationCalls } from './translations-api.types';

/** The admin translations editor, on one api client. */
export function translationCalls(client: ApiClient): TranslationCalls {
  const call = callWith(client);
  return {
    keys: (query) => call({ route: translationRoutes.keys, query }),
    save: (params, body) => call({ route: translationRoutes.save, params, body }),
    restore: (params) => call({ route: translationRoutes.restore, params }),
  };
}
