import { z } from 'zod';
import { WaError, type MetaTemplate } from './whatsapp.types';

// Graph response bodies the client reads, validated (Meta's spelling, docs/12 §3.2).

/** A body that fails its schema → WaError (code null, status 200: Meta answered, but not as expected). */
export function parsed<S extends z.ZodType>(schema: S, json: unknown): z.output<S> {
  const r = schema.safeParse(json);
  if (!r.success) throw new WaError('Unexpected WhatsApp response', { code: null, status: 200, details: r.error.message.slice(0, 300) });
  return r.data;
}

export const sentSchema = z.object({ messages: z.array(z.object({ id: z.string().min(1) })).min(1) });

const metaTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  language: z.string(),
  status: z.string(),
  category: z.string().default(''),
  quality_score: z.object({ score: z.string().optional() }).nullish(),
  components: z.array(z.unknown()).default([]),
  /** Meta sends «NONE» on templates that were never rejected. */
  rejected_reason: z.string().nullish(),
});

export const templatesPageSchema = z.object({
  data: z.array(metaTemplateSchema),
  paging: z
    .object({ next: z.string().optional(), cursors: z.object({ after: z.string().optional() }).optional() })
    .optional(),
});

export function toMetaTemplate(t: z.infer<typeof metaTemplateSchema>): MetaTemplate {
  const reason = t.rejected_reason && t.rejected_reason !== 'NONE' ? t.rejected_reason : null;
  return {
    id: t.id,
    name: t.name,
    language: t.language,
    status: t.status,
    category: t.category,
    quality: t.quality_score?.score ?? null,
    components: t.components,
    rejectedReason: reason,
  };
}

/** Create answers `{ id, status, category }`; an edit answers `{ success: true }`. */
export const submitSchema = z.object({ id: z.string().optional(), status: z.string().optional() });

export const mediaSchema = z.object({ url: z.string().min(1), mime_type: z.string().min(1) });

/** Resumable Upload API: the session (`upload:…`, used verbatim as the next path), then the handle. */
export const uploadSessionSchema = z.object({ id: z.string().regex(/^upload:[^/\s]+$/) });
export const uploadHandleSchema = z.object({ h: z.string().min(1) });

// Line diagnostics (docs/12 §13.9): tolerant, every field optional, unknown fields ignored.

const optional = z.string().optional();

/** GET /{phone_number_id}?fields=… */
export const phoneNumberSchema = z.object({
  display_phone_number: optional,
  verified_name: optional,
  quality_rating: optional,
  status: optional,
  name_status: optional,
  code_verification_status: optional,
});

/** GET /{waba_id}/subscribed_apps; override_callback_uri only when a WABA-level override is set. */
export const subscribedAppsSchema = z.object({
  data: z.array(
    z.object({
      whatsapp_business_api_data: z
        .object({ id: optional, name: optional, link: optional, override_callback_uri: optional })
        .optional(),
    }),
  ),
});
