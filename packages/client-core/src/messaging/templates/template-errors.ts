import { z } from 'zod';
import { ApiError } from '../../core/http/index.js';

// The words for a refused template create or edit (owner 2026-11-14). Each app injects its
// `t.templates.error` (read on every call: the admins' overrides land after import). The app's own
// words for the code first (its language), then the API's MSA reason, then the generic line.

const refusal = z.object({
  code: z.string(),
  message_ar: z.string().optional(),
  max: z.number().optional(),
});

/** `{max}` and the like, filled from the error body. */
const filled = (text: string, values: { max?: number | undefined }): string =>
  text.replace('{max}', String(values.max ?? '{max}'));

type Refusal = z.infer<typeof refusal>;

const refusalOf = (error: unknown): Refusal | null => {
  const parsed = error instanceof ApiError ? refusal.safeParse(error.body) : null;
  return parsed?.success ? parsed.data : null;
};

export function templateErrorWords(
  text: () => Readonly<Record<string, string | undefined>>,
  fallback: () => string,
): (error: unknown) => string {
  return (error) => {
    const body = refusalOf(error);
    if (!body) return fallback();
    const own = text()[body.code];
    return own ? filled(own, body) : (body.message_ar ?? fallback());
  };
}
