import { isLinkedRole, type LinkKind } from '@ab/shared';
import type { UserRole } from '@ab/catalog';
import type { EditForm } from './edit-form';
import type {
  RecordForm,
  RecordView,
  RoleSection,
  RoleSectionInput,
  RoleText,
} from './form-sections.types';

type Patch = (patch: Partial<RecordForm>) => void;

/** The parts of the record section that show, with their values and handlers (web and mobile). */
export function recordView(kind: LinkKind, value: RecordForm, onChange: Patch): RecordView {
  const teacher = kind === 'teacher';
  const fresh = teacher && value.teacherMode === 'new';
  const mode = {
    value: value.teacherMode,
    onChange: (teacherMode: RecordForm['teacherMode']) => onChange({ teacherMode }),
  };
  const newTeacher = {
    value: value.newTeacher,
    onChange: (next: RecordForm['newTeacher']) => onChange({ newTeacher: next }),
  };
  const picker = {
    kind,
    value: value.linked,
    onChange: (linked: RecordForm['linked']) => onChange({ linked }),
  };
  const shown = <T>(on: boolean, part: T): T | null => (on ? part : null);
  return {
    mode: shown(teacher, mode),
    newTeacher: shown(fresh, newTeacher),
    picker: shown(!fresh, picker),
  };
}

const recordKindOf = (f: EditForm, locked: boolean): LinkKind | null =>
  !locked && isLinkedRole(f.role) ? f.role : null;

/** The role picker (state and hint) and the record kind the role section asks for. */
export function roleSection(ctx: RoleSectionInput, text: RoleText): RoleSection {
  const recordKind = recordKindOf(ctx.form, ctx.roleLocked);
  const hints = [
    [ctx.roleLocked, text.roleLocked],
    [recordKind !== null, text.roleRecord],
  ] as const;
  const hint = hints.find(([shown]) => shown)?.[1];
  const disabled = ctx.readOnly || ctx.roleLocked;
  return { recordKind, picker: { role: ctx.form.role, roleId: ctx.form.role_id, disabled, hint } };
}

/** A picked role, keeping the picked record only when it is of that role's kind. */
export function withRole(f: EditForm, next: { role: UserRole; roleId: string }): Partial<EditForm> {
  const linked = f.linked?.kind === next.role ? f.linked : null;
  return { role: next.role, role_id: next.roleId, linked };
}
