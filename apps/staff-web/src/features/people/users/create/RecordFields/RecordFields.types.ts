import type { LinkKind } from '@ab/shared';
import type { CreateForm } from '@/features/people/users/create/create-form';
import type { FormErrors } from '@/features/people/users/validation';

type RecordForm = Pick<CreateForm, 'linked' | 'teacherMode' | 'newTeacher'>;

export interface RecordFieldsProps {
  kind: LinkKind;
  value: RecordForm;
  onChange: (patch: Partial<RecordForm>) => void;
  errors: FormErrors;
  /** The record came from the page (student profile): it cannot be swapped. */
  locked?: boolean;
}
