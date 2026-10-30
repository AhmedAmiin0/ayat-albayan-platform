import type { TablesUpdate } from '@ab/db';
import { quickReplyIntent, type TemplateButton, type TemplateStatus } from '@ab/shared';
import { z } from 'zod';
import { templateButtons } from '../../messages/wa-json';
import { metaDisplay } from './template-display';
import type { MetaTemplate, TemplateRow } from '../../whatsapp.types';

// The health check's pure part (docs/12 §3.4): Meta's view of one template → our registry row.

const META_STATUS: Record<string, TemplateStatus> = {
  APPROVED: 'approved',
  PENDING: 'pending',
  IN_APPEAL: 'pending',
  REJECTED: 'rejected',
  PAUSED: 'paused',
  DISABLED: 'disabled',
  LIMIT_EXCEEDED: 'disabled',
  ARCHIVED: 'disabled',
  PENDING_DELETION: 'disabled',
  DELETED: 'disabled',
};

/** Meta status → ours. Anything new from Meta reads as pending: never sendable by mistake. */
export function ourStatus(metaStatus: string): TemplateStatus {
  return META_STATUS[metaStatus.toUpperCase()] ?? 'pending';
}

const componentSchema = z.object({
  type: z.string(),
  /** HEADER only: TEXT | IMAGE | VIDEO | DOCUMENT | LOCATION (the chat import skips all but TEXT). */
  format: z.string().optional(),
  text: z.string().optional(),
  buttons: z
    .array(z.object({ type: z.string(), text: z.string().optional(), url: z.string().optional(), phone_number: z.string().optional() }))
    .optional(),
});
export type Component = z.infer<typeof componentSchema>;

/** Meta's components we model, type upper-cased; a malformed one is dropped. */
export function components(raw: readonly unknown[]): Component[] {
  return raw.flatMap((c) => {
    const r = componentSchema.safeParse(c);
    return r.success ? [{ ...r.data, type: r.data.type.toUpperCase() }] : [];
  });
}

/**
 * Meta's buttons with our quick-reply intents kept by index (else read from the button text).
 * null = a button we can't model (phone, copy code, an unknown reply): keep ours, so the button
 * indexes the sender uses stay right.
 */
type MetaButton = NonNullable<Component['buttons']>[number];

function toButton(b: MetaButton, mine: TemplateButton | undefined): TemplateButton | null {
  const type = b.type.toUpperCase();
  if (type === 'URL' && b.url) return { type: 'url', url: b.url, ...(b.text ? { text: b.text } : {}) };
  if (type !== 'QUICK_REPLY' || !b.text) return null;
  const intent = mine?.type === 'quick_reply' ? mine.intent : quickReplyIntent(b.text);
  return intent ? { type: 'quick_reply', text: b.text, intent } : null;
}

export function metaButtons(comps: readonly Component[], ours: readonly TemplateButton[]): TemplateButton[] | null {
  const raw = comps.find((c) => c.type === 'BUTTONS')?.buttons ?? [];
  const out = raw.map((b, i) => toButton(b, ours[i]));
  return out.every((b): b is TemplateButton => b !== null) ? out : null;
}

export type TemplatePatch = TablesUpdate<'message_templates'>;

/**
 * One row after a health check: status, quality, meta id, the rejection reason, and Meta's own
 * BODY / FOOTER / BUTTONS over our shapes. Not on Meta: a never-submitted row stays
 * not_submitted, anything else is missing.
 */
export function syncPatch(row: TemplateRow, meta: MetaTemplate | undefined, now: Date): TemplatePatch {
  const checked = { last_checked_at: now.toISOString() };
  if (!meta) return { ...checked, status: row.status === 'not_submitted' ? 'not_submitted' : 'missing' };
  const status = ourStatus(meta.status);
  const comps = components(meta.components);
  const body = comps.find((c) => c.type === 'BODY')?.text;
  const buttons = metaButtons(comps, templateButtons(row.buttons));
  return {
    ...checked,
    status,
    meta_id: meta.id,
    quality: meta.quality,
    last_error: status === 'rejected' ? meta.rejectedReason : null,
    ...(body ? { body_ar: body } : {}),
    footer_ar: comps.find((c) => c.type === 'FOOTER')?.text ?? null,
    ...(buttons ? { buttons } : {}),
    display: metaDisplay(comps),
  };
}

/** The Meta template a registry row stands for: same name and language. */
export function findMeta(row: TemplateRow, meta: readonly MetaTemplate[]): MetaTemplate | undefined {
  return meta.find((t) => t.name === row.meta_name && t.language === row.language);
}
