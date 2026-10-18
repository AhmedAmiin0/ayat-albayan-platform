import {
  BODY_SLOTS,
  forAudience as audienceOf,
  lessonParams,
  LESSON_TIME_PARAMS,
  type BodySlot,
  type TemplateParamsInput,
  type TemplateView,
  type ThreadLesson,
} from '@ab/shared';
import { t } from '@/lib/i18n';

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

/** The URL button's address with {{1}} in it, or null when the template has none. */
export function urlButton(tpl: Pick<TemplateView, 'buttons'>): string | null {
  const button = tpl.buttons.find((b) => b.type === 'url');
  return button?.type === 'url' && button.url.includes('{{1}}') ? button.url : null;
}

/** Teacher templates go to teachers only, and a teacher gets nothing else (docs/12 §2.1). */
export const forAudience = (tpl: Pick<TemplateView, 'key'>, teacher: boolean): boolean => audienceOf(tpl.key, teacher);

export interface PrefillContext {
  /** qualification.student_name of the thread's lead. */
  studentName?: string | null;
  /** The thread is a teacher's. */
  teacherName?: string | null;
  /** ThreadView.display_name, the name the thread header shows (guardian ?? lead ?? teacher). */
  contactName?: string | null;
  /** The guardian's / teacher's next open lessons (ThreadDetail.lessons). */
  lessons?: readonly ThreadLesson[];
}

/** What the thread already knows: the student's, the teacher's or the recipient's name (still editable). */
export function prefillParams(tpl: Pick<TemplateView, 'params'>, ctx: PrefillContext): ParamValues {
  const known: Record<string, string | null | undefined> = {
    student_names: ctx.studentName,
    student_name: ctx.studentName,
    teacher_name: ctx.teacherName,
    contact_name: ctx.contactName,
  };
  const out: ParamValues = {};
  tpl.params.slice(0, SLOTS.length).forEach((name, i) => {
    const value = known[name]?.trim();
    const slot = SLOTS[i];
    if (value && slot) out[slot] = value;
  });
  return out;
}

/** The picked lesson's values: its time in the recipient's tz, the names, the meeting code. */
export const lessonValues = (tpl: Pick<TemplateView, 'params' | 'buttons'>, lesson: ThreadLesson): ParamValues =>
  lessonParams(tpl, lesson);

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
