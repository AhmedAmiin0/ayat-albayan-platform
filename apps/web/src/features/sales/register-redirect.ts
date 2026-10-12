import { normalizePhone } from '@ab/shared';

/**
 * Where an old /sales/register?leadId&phone&name link goes: «تسجيل طالب جديد» now lives in the chat,
 * so the sales inbox, opened on that number when the link carried one.
 */
export function registerRedirect(search: Record<string, unknown>) {
  const raw = search['phone'];
  const phone = typeof raw === 'string' ? normalizePhone(raw) : null;
  return {
    to: '/sales/inbox' as const,
    search: phone?.ok ? { page: 1, phone: phone.e164 } : { page: 1 },
  };
}
