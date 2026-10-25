import { isChatListError } from '@ab/shared';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';

/**
 * The inline line under a list's name field: the 409s (the name is taken, 30 lists already), a
 * list another assistant just deleted (404), else «تعذر حفظ التغيير».
 */
export function listErrorText(error: unknown): string {
  if (error instanceof ApiError) {
    const code: unknown =
      typeof error.body === 'object' && error.body !== null ? Reflect.get(error.body, 'code') : null;
    if (isChatListError(code)) return code === 'list_limit' ? t.inbox.lists.limit : t.inbox.lists.nameTaken;
    if (error.status === 404) return t.inbox.lists.notFound;
  }
  return t.inbox.lists.saveError;
}
