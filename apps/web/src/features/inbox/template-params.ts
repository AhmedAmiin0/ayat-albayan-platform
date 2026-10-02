import type { TemplateParamsInput, TemplateView } from '@ab/shared';
import { t } from '@/lib/i18n';

// The inbox template composer's form (R-LEAD-02, docs/12 H4): {{1}}…{{3}} by position, plus the
// URL button's suffix (the Meet code / Jitsi room) when the template has one.

export type ParamSlot = '1' | '2' | '3';
export type ParamValues = Partial<Record<ParamSlot | 'button', string>>;

const SLOTS: readonly ParamSlot[] = ['1', '2', '3'];
const NAMES: Record<string, string | undefined> = t.inbox.composer.paramNames;

/** The body variables a template takes, by position, with their human names. */
export function paramFields(tpl: Pick<TemplateView, 'params'>): { slot: ParamSlot; label: string }[] {
  return SLOTS.slice(0, tpl.params.length).map((slot, i) => ({
    slot,
    label: NAMES[tpl.params[i] ?? ''] ?? t.inbox.composer.param.replace('{n}', slot),
  }));
}

/** The URL button's address with {{1}} in it, or null when the template has none. */
export function urlButton(tpl: Pick<TemplateView, 'buttons'>): string | null {
  const button = tpl.buttons.find((b) => b.type === 'url');
  return button?.type === 'url' && button.url.includes('{{1}}') ? button.url : null;
}

export interface PrefillContext {
  /** qualification.student_name of the thread's lead. */
  studentName?: string | null;
  /** The thread is a teacher's. */
  teacherName?: string | null;
}

/**
 * What the thread already knows. Lesson times are not prefilled: the inbox has no lesson to read
 * them from. TODO(R-LEAD-02): pick the guardian's next lesson once ThreadDetail carries it.
 */
export function prefillParams(tpl: Pick<TemplateView, 'params'>, ctx: PrefillContext): ParamValues {
  const known: Record<string, string | null | undefined> = {
    student_names: ctx.studentName,
    student_name: ctx.studentName,
    teacher_name: ctx.teacherName,
  };
  const out: ParamValues = {};
  tpl.params.slice(0, SLOTS.length).forEach((name, i) => {
    const value = known[name]?.trim();
    const slot = SLOTS[i];
    if (value && slot) out[slot] = value;
  });
  return out;
}

/** Every variable and the button suffix are required (Meta rejects a missing one: 132000). */
export function missingParams(tpl: Pick<TemplateView, 'params' | 'buttons'>, values: ParamValues): (ParamSlot | 'button')[] {
  const needed: (ParamSlot | 'button')[] = paramFields(tpl).map((f) => f.slot);
  if (urlButton(tpl)) needed.push('button');
  return needed.filter((k) => !values[k]?.trim());
}

/** The request's `params`: trimmed values for the template's own slots only. */
export function toParamsInput(tpl: Pick<TemplateView, 'params' | 'buttons'>, values: ParamValues): TemplateParamsInput {
  const out: TemplateParamsInput = {};
  for (const { slot } of paramFields(tpl)) {
    const value = values[slot]?.trim();
    if (value) out[slot] = value;
  }
  const button = values.button?.trim();
  if (urlButton(tpl) && button) out.button = button;
  return out;
}
