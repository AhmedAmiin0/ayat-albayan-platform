import { roleSection, withRole } from '@ab/client-core';
import { t } from '@ab/mobile-kit';
import { RecordFields } from '@/users/create/RecordFields';
import { RolePicker } from '@/users/create/RolePicker';
import type { RoleFieldsProps } from './RoleFields.types';

/**
 * The role of a login and, when an unlinked staff login takes a teacher / student / guardian
 * role, the record it gets; Save waits for that record (recordMissing).
 */
export function RoleFields(props: RoleFieldsProps) {
  const section = roleSection(props, t.users.form);
  const pick = (next: Parameters<typeof withRole>[1]) => props.onChange(withRole(props.form, next));
  const kind = section.recordKind;
  return (
    <>
      <RolePicker {...section.picker} options={props.options} onChange={pick} />
      {kind ? (
        <RecordFields
          kind={kind}
          value={props.form}
          errors={props.errors}
          onChange={props.onChange}
        />
      ) : null}
    </>
  );
}
