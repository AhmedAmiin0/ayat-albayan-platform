import type { Json } from '@ab/db';
import type { TemplateAuthorInput, TemplateDisplay } from '@ab/shared';
import type { ImportRow } from '@/modules/messaging/whatsapp/templates/sync/template-import';

// A sales template's registry row (owner 2026-11-14), pure: on the chat line (where the restricted
// roles send from), on the allow-list from the start, written by `created_by`.

/** A Meta name for a template the author did not name: tpl_<yyyymmdd>_<6 random>. */
export function authorKey(now: Date, random: string): string {
  const day = now.toISOString().slice(0, 10).replace(/-/g, '');
  const tail = random.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6).padEnd(6, '0');
  return `tpl_${day}_${tail}`;
}

/**
 * Not submitted yet (the service submits it at once). Plain quick replies have no intent: they live
 * in `display` only, as an imported template's (the submit sends them from there).
 */
export function authoredRow(
  input: TemplateAuthorInput,
  opts: { key: string; by: string },
): ImportRow {
  const display: TemplateDisplay = {
    header: null,
    buttons: input.buttons.map((b) => ({ type: 'quick_reply', text: b.text })),
  };
  return {
    key: opts.key,
    meta_name: opts.key,
    line: 'chat',
    language: 'ar',
    category: input.category,
    body_ar: input.body,
    footer_ar: input.footer,
    params: input.params.map((p) => p.name),
    samples: input.params.map((p) => p.sample),
    buttons: [],
    // Plain JSON (strings and arrays); TS cannot see the display interfaces as Json.
    display: display as unknown as Json,
    status: 'not_submitted',
    sales_starter: true,
    created_by: opts.by,
  };
}
