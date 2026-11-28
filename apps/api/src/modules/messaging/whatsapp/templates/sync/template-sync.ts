import type { TablesUpdate } from '@ab/db';
import { quickReplyIntent, type TemplateButton } from '@ab/shared';
import { templateStatusSchema, type TemplateStatus } from '@ab/catalog';
import { z } from 'zod';
import { templateButtons } from '@/modules/messaging/whatsapp/messages/wa-json';
import { own } from '@/common/infra/own-value';
import { metaDisplay } from './template-display';
import type { MetaTemplate, TemplateRow } from '@/modules/messaging/whatsapp/whatsapp.types';

// The health check's pure part (docs/12 §3.4): Meta's view of one template → our registry row.

const META_STATUS = z.record(z.string(), templateStatusSchema).readonly().decode({
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
});

/** Meta status → ours. Anything new from Meta reads as pending: never sendable by mistake. */
export function ourStatus(metaStatus: string): TemplateStatus {
  return own(META_STATUS, metaStatus.toUpperCase()) ?? 'pending';
}

const componentSchema = z.object({
  type: z.string(),
  /**
   * HEADER only: TEXT | IMAGE | VIDEO | DOCUMENT | LOCATION (the chat import skips all but TEXT).
   */
  format: z.string().optional(),
  text: z.string().optional(),
  buttons: z
    .array(
      z.object({
        type: z.string(),
        text: z.string().optional(),
        url: z.string().optional(),
        phone_number: z.string().optional(),
      }),
    )
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

type MetaButton = NonNullable<Component['buttons']>[number];

const urlButton = (b: MetaButton): TemplateButton | null =>
  b.url ? { type: 'url', url: b.url, ...(b.text ? { text: b.text } : {}) } : null;

/** Our intent kept by index, else read from the button text; null when neither names one. */
function replyButton(b: MetaButton, mine: TemplateButton | undefined): TemplateButton | null {
  if (!b.text) return null;
  const intent = mine?.type === 'quick_reply' ? mine.intent : quickReplyIntent(b.text);
  return intent ? { type: 'quick_reply', text: b.text, intent } : null;
}

function toButton(b: MetaButton, mine: TemplateButton | undefined): TemplateButton | null {
  const type = b.type.toUpperCase();
  if (type === 'URL') return urlButton(b);
  return type === 'QUICK_REPLY' ? replyButton(b, mine) : null;
}

/**
 * Meta's buttons with our quick-reply intents kept by index (else read from the button text).
 * null = a button we can't model (phone, copy code, an unknown reply): keep ours, so the button
 * indexes the sender uses stay right.
 */
export function metaButtons(
  comps: readonly Component[],
  ours: readonly TemplateButton[],
): TemplateButton[] | null {
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
export function syncPatch(
  row: TemplateRow,
  meta: MetaTemplate | undefined,
  now: Date,
): TemplatePatch {
  const checked = { last_checked_at: now.toISOString() };
  if (!meta) return { ...checked, status: row.status === 'not_submitted' ? 'not_submitted' : 'missing' };
  const status = ourStatus(meta.status);
  return {
    ...checked,
    status,
    meta_id: meta.id,
    quality: meta.quality,
    last_error: status === 'rejected' ? meta.rejectedReason : null,
    ...metaParts(components(meta.components), row),
  };
}

/** Meta's own BODY / FOOTER / BUTTONS over ours; a body or button list we can't take keeps ours. */
function metaParts(comps: readonly Component[], row: TemplateRow): TemplatePatch {
  const body = comps.find((c) => c.type === 'BODY')?.text;
  const buttons = metaButtons(comps, templateButtons(row.buttons));
  return {
    ...(body ? { body_ar: body } : {}),
    footer_ar: comps.find((c) => c.type === 'FOOTER')?.text ?? null,
    ...(buttons ? { buttons } : {}),
    display: metaDisplay(comps),
  };
}

/** The Meta template a registry row stands for: same name and language. */
export function findMeta(
  row: TemplateRow,
  meta: readonly MetaTemplate[],
): MetaTemplate | undefined {
  return meta.find((t) => t.name === row.meta_name && t.language === row.language);
}
