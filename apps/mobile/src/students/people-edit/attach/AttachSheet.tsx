import { roleActions } from '@ab/client-core';
import { formatPhone } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { SearchField } from '@/core/ui/form/SearchField';
import { ltr } from '@/core/ui/primitives/Ltr';
import { Note } from '@/more';
import { SheetActions } from '@/students/course-pause/SheetActions';
import type { PeopleSheetProps } from '@/students/people-edit/PeopleEditSection';
import { FamilyRow } from './FamilyRow';
import { NewFamilyFields } from './NewFamilyFields';
import { useAttach } from './use-attach';

const E = t.peopleEdit;

/**
 * «ربط بولي أمر آخر»: pick a family by name, number or a child's code, or a new guardian by
 * number, then confirm. Only students.guardian_id changes: packages, lessons and payments stay.
 */
export function AttachSheet({ view, onClose, onDone }: PeopleSheetProps) {
  const a = useAttach(view, onDone);
  const canMove = roleActions(view).canMove;
  const { guardian } = view;
  const current = E.currentFamily
    .replace('{name}', guardian.name)
    .replace('{phone}', ltr(formatPhone(guardian.phone_e164)));
  return (
    <View style={{ gap: 16 }}>
      <Note>{current}</Note>
      <SearchField label={E.search} onSearch={a.setSearch} />
      {a.empty ? <Note>{E.noResults}</Note> : null}
      {(a.results ?? []).map((f) => (
        <FamilyRow
          key={f.id}
          family={f}
          picked={a.choice?.id === f.id}
          current={f.id === guardian.id}
          onPick={() => a.pick(f)}
        />
      ))}
      <NewFamilyFields value={a.fresh} error={a.error} onChange={a.editFresh} onUse={a.takeFresh} />
      {canMove ? null : <Note alert>{E.moveLogin}</Note>}
      {a.confirmText ? <Note>{a.confirmText}</Note> : null}
      {a.move.errorText ? <Note alert>{a.move.errorText}</Note> : null}
      <SheetActions
        label={E.confirm}
        busy={a.move.isPending}
        onConfirm={canMove ? a.submit : () => undefined}
        onCancel={onClose}
      />
    </View>
  );
}
