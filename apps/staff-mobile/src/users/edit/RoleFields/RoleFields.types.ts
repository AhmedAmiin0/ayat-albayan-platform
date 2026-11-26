import type { UserRoleOption } from '@ab/shared';
import type { EditForm } from '@/users/edit/edit-form';
import type { FormErrors } from '@/users/shared/validation';

export interface RoleFieldsProps {
  form: EditForm;
  onChange: (patch: Partial<EditForm>) => void;
  errors: FormErrors;
  options: readonly UserRoleOption[];
  readOnly: boolean;
  /** A linked login, or one of a record-backed role, keeps its role (API: role_change_linked). */
  roleLocked: boolean;
}
