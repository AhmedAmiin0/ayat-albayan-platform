import { z } from 'zod';

/** messages.media_refusal: a final answer about a file, never a failure a retry may fix. */
export const mediaRefusalSchema = z.enum(['invoice_too_large', 'media_expired']);
export type MediaRefusal = z.infer<typeof mediaRefusalSchema>;
