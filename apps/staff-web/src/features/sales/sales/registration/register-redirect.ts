import { normalizePhone } from '@ab/core';

/** Registration now lives in the chat, so old links open the sales inbox on that number. */
export function registerRedirect(search: Record<string, unknown>) {
  const raw = search['phone'];
  const phone = typeof raw === 'string' ? normalizePhone(raw) : null;
  return {
    to: '/sales/inbox' as const,
    search: phone?.ok ? { page: 1, phone: phone.e164 } : { page: 1 },
  };
}
