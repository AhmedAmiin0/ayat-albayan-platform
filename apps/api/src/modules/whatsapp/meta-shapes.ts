import { z } from 'zod';
import type { MetaTemplate } from './whatsapp.types';

// Graph response bodies the client reads, validated (Meta's spelling, docs/12 §3.2).

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
