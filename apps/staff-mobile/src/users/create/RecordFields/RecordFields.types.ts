import type { LinkKind } from '@ab/shared';
import type { CreateForm } from '@/users/create/create-form';
import type { FormErrors } from '@/users/shared/validation';

type RecordForm = Pick<CreateForm, 'linked' | 'teacherMode' | 'newTeacher'>;

export interface RecordFieldsProps {
  kind: LinkKind;
  value: RecordForm;
  onChange: (patch: Partial<RecordForm>) => void;
  errors: FormErrors;
  /** The record came from the student file: it cannot be swapped. */
  locked?: boolean;
}
