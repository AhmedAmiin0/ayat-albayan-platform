import { BODY_SLOTS, type BodySlot } from './templates.js';
import type { TemplateView } from './template-views.js';

// A template's starting values in the composer (R-LEAD-02, docs/12 H4): what the thread already
// knows, by the variable's name; still editable. Lesson times are never prefilled (rule 6: they come
// from a picked lesson). Shared by both apps (docs/27 E6).

export interface TemplatePrefill {
  /** qualification.student_name of the thread's lead: student_names / student_name. */
  studentName?: string | null;
  /** The thread is a teacher's: teacher_name. */
  teacherName?: string | null;
  /** ThreadView.display_name, the name the thread header shows (guardian ?? lead ?? teacher): contact_name. */
  contactName?: string | null;
}

/** {{n}} → the known, trimmed value for each of the template's first nine variables; blanks are left out. */
export function prefillParams(tpl: Pick<TemplateView, 'params'>, ctx: TemplatePrefill): Partial<Record<BodySlot, string>> {
  const known: Record<string, string | null | undefined> = {
    student_names: ctx.studentName,
    student_name: ctx.studentName,
    teacher_name: ctx.teacherName,
    contact_name: ctx.contactName,
  };
  const out: Partial<Record<BodySlot, string>> = {};
  tpl.params.slice(0, BODY_SLOTS.length).forEach((name, i) => {
    const value = known[name]?.trim();
    const slot = BODY_SLOTS[i];
    if (value && slot) out[slot] = value;
  });
  return out;
}
