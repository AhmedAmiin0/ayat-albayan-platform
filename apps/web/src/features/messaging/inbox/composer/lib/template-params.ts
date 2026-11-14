import {
  BODY_SLOTS,
  forAudience as audienceOf,
  freeTextSlot,
  normaliseTemplateParam,
  sendableFreeText,
  lessonParams,
  LESSON_TIME_PARAMS,
  prefillParams as prefillTemplateParams,
  type BodySlot,
  type TemplatePrefill,
  type TemplateParamsInput,
  type TemplateView,
  type ThreadLesson,
} from '@ab/shared';
import { t } from '@/lib/i18n/i18n';

// The inbox template composer's form (R-LEAD-02, docs/12 H4): {{1}}…{{9}} by position, plus the
// URL button's suffix (the Meet code / Jitsi room) when the template has one. Lesson times come
// from a picked lesson, never typed (rule 6).

export type ParamSlot = BodySlot;
export type ParamValues = Partial<Record<ParamSlot | 'button', string>>;

const SLOTS: readonly ParamSlot[] = BODY_SLOTS;
const NAMES: Record<string, string | undefined> = t.inbox.composer.paramNames;

/** The body variables a template takes, by position, with their human names («المتغير n» for an imported var_n). */
export function paramFields(tpl: Pick<TemplateView, 'params'>): { slot: ParamSlot; label: string; fromLesson: boolean }[] {
  return SLOTS.slice(0, tpl.params.length).map((slot, i) => {
    const name = tpl.params[i] ?? '';
    return { slot, label: NAMES[name] ?? t.inbox.composer.param.replace('{n}', slot), fromLesson: LESSON_TIME_PARAMS.includes(name) };
  });
}

/** The template's free-text slot («نص الرسالة», owner 2026-11-14) among its variables, or null. */
export const freeTextField = (tpl: Pick<TemplateView, 'key' | 'params'>): ParamSlot | null =>
  paramFields(tpl).find((f) => f.slot === freeTextSlot(tpl.key))?.slot ?? null;

/** The URL button's address with {{1}} in it, or null when the template has none. */
export function urlButton(tpl: Pick<TemplateView, 'buttons'>): string | null {
  const button = tpl.buttons.find((b) => b.type === 'url');
  return button?.type === 'url' && button.url.includes('{{1}}') ? button.url : null;
}

/** Teacher templates go to teachers only, and a teacher gets nothing else (docs/12 §2.1). */
export const forAudience = (tpl: Pick<TemplateView, 'key'>, teacher: boolean): boolean => audienceOf(tpl.key, teacher);

export interface PrefillContext extends TemplatePrefill {
  /** The family's first student (ThreadDetail.people.students[0]): a saved reply's {student}. */
  firstStudentName?: string | null;
  /** The guardian's / teacher's next open lessons (ThreadDetail.lessons). */
  lessons?: readonly ThreadLesson[];
}

/** What the thread already knows: the student's, the teacher's or the recipient's name (still editable; shared with mobile). */
export const prefillParams = (tpl: Pick<TemplateView, 'params'>, ctx: PrefillContext): ParamValues => prefillTemplateParams(tpl, ctx);

/** The picked lesson's values: its time in the recipient's tz, the names, the meeting code. */
export const lessonValues = (tpl: Pick<TemplateView, 'params' | 'buttons'>, lesson: ThreadLesson): ParamValues =>
  lessonParams(tpl, lesson);

/** Every variable and the button suffix are required (Meta rejects a missing one: 132000). */
export function missingParams(tpl: Pick<TemplateView, 'params' | 'buttons'>, values: ParamValues): (ParamSlot | 'button')[] {
  const needed: (ParamSlot | 'button')[] = paramFields(tpl).map((f) => f.slot);
  if (urlButton(tpl)) needed.push('button');
  return needed.filter((k) => !values[k]?.trim());
}

type SendShape = Pick<TemplateView, 'key' | 'body_ar' | 'params' | 'buttons'>;

/**
 * A slot's value as it is sent (Meta 132018, owner 2026-11-14): normalised (no newline, tab or run
 * of spaces); a free-text slot («نص الرسالة») is also cut so the whole body stays within the limit.
 */
function sendValue(tpl: SendShape, slot: ParamSlot, raw: string): string {
  const free = freeTextSlot(tpl.key) === slot;
  return free ? sendableFreeText(tpl.body_ar, slot, raw) : normaliseTemplateParam(raw);
}

/** The request's `params` (and the preview's): sendable values of the template's own slots. */
export function toParamsInput(tpl: SendShape, values: ParamValues): TemplateParamsInput {
  const out: TemplateParamsInput = {};
  for (const { slot } of paramFields(tpl)) {
    const value = sendValue(tpl, slot, values[slot] ?? '');
    if (value) out[slot] = value;
  }
  const button = values.button?.trim();
  if (urlButton(tpl) && button) out.button = button;
  return out;
}
