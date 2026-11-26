import type { LinkCandidate, LinkKind } from '@ab/shared';
import type { UserRole } from '@ab/catalog';
import type { CreateForm, NewTeacherForm } from './create-form';
import type { EditForm } from './edit-form';

export type RecordForm = Pick<CreateForm, 'linked' | 'teacherMode' | 'newTeacher'>;

interface Part<V> {
  value: V;
  onChange: (next: V) => void;
}

/** The parts of the record section that show (null = hidden). */
export interface RecordView {
  mode: Part<CreateForm['teacherMode']> | null;
  newTeacher: Part<NewTeacherForm> | null;
  picker: (Part<LinkCandidate | null> & { kind: LinkKind }) | null;
}

export interface RoleText {
  roleLocked: string;
  roleRecord: string;
}

export interface RoleSectionInput {
  form: EditForm;
  readOnly: boolean;
  roleLocked: boolean;
}

export interface RoleSection {
  /** The record a new teacher / student / guardian role asks for (null = none). */
  recordKind: LinkKind | null;
  picker: { role: UserRole; roleId: string; disabled: boolean; hint: string | undefined };
}
