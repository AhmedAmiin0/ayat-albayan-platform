import type { UserRoleOption } from '@ab/shared';
import type { EditForm } from '@/features/people/users/edit/edit-form';
import type { FormErrors } from '@/features/people/users/validation';

export interface RoleFieldsProps {
  form: EditForm;
  onChange: (patch: Partial<EditForm>) => void;
  errors: FormErrors;
  options: readonly UserRoleOption[];
  readOnly: boolean;
  /** A linked login, or one of a record-backed role, keeps its role (API: role_change_linked). */
  roleLocked: boolean;
}
