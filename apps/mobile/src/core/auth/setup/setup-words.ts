import { z } from 'zod';
import { t } from '@/core/lib/i18n/i18n';

const refusal = z.object({
  body: z.object({ code: z.enum(['setup_done', 'email_taken', 'invalid_email']) }),
});

/** PUT /me/setup's own refusals in words (docs/46 A4); null = another error (the sign-in words). */
export function setupRefusal(error: unknown): string | null {
  const parsed = refusal.safeParse(error);
  return parsed.success ? t.teacherAuth.setup.errors[parsed.data.body.code] : null;
}
