import { roleSection, withRole } from '@ab/client-core';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { RecordFields } from '@/features/people/users/create/RecordFields';
import { RolePicker } from '@/features/people/users/create/RolePicker';
import type { RoleFieldsProps } from './RoleFields.types';

const F = t.users.form;

/**
 * The role of a login and, when an unlinked staff login takes a teacher / student / guardian
 * role, the record it gets; Save waits for that record (recordMissing).
 */
export function RoleFields(props: RoleFieldsProps) {
  const { form, onChange, errors, options } = props;
  const { picker, recordKind } = roleSection(props, F);
  return (
    <>
      <RolePicker
        {...picker}
        options={options}
        onChange={(next) => onChange(withRole(form, next))}
      />
      {recordKind && (
        <RecordFields kind={recordKind} value={form} errors={errors} onChange={onChange} />
      )}
    </>
  );
}
