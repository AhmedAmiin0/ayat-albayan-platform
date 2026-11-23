import { allowedPeopleActions, type PeopleActionKind, type PeopleDone } from '@ab/client-core';
import { useState } from 'react';
import { View } from 'react-native';
import { usePermissions, t, Button } from '@ab/mobile-kit';
import { Note } from '@/more';
import { AttachSheet } from '@/students/people-edit/attach/AttachSheet';
import { ConvertSheet } from '@/students/people-edit/convert/ConvertSheet';
import { EditDataSheet } from '@/students/people-edit/EditDataSheet';
import { usePeopleEditView } from '@/students/people-edit/people-edit-api';
import { PeopleSheetHost, type PeopleSheetEntry } from '@/students/people-edit/PeopleSheetHost';

const E = t.peopleEdit;

export type { PeopleSheetProps } from '@/students/people-edit/PeopleSheetHost';

/** Each action's label and sheet; which ones a role sees: @ab/client-core allowedPeopleActions. */
const SHEETS: Record<PeopleActionKind, PeopleSheetEntry> = {
  edit: { label: E.editData, Sheet: EditDataSheet },
  attach: { label: E.attach, Sheet: AttachSheet },
  convert: { label: E.convert, Sheet: ConvertSheet },
};

interface PeopleEditSectionProps {
  studentId: string;
  /** «تحويل إلى ولي أمر» removed the student row: the screen leaves it. */
  onRemoved?: () => void;
}

/**
 * «تعديل البيانات» · «ربط بولي أمر آخر» · «تحويل إلى طالب / ولي أمر» (owner 2026-11-02) in sales'
 * «تفاصيل الطالب» and the admin's student file: only the actions the role holds, each a page sheet
 * over the loaded edit view; the last success shows above the buttons.
 */
export function PeopleEditSection({ studentId, onRemoved }: PeopleEditSectionProps) {
  const can = usePermissions();
  const [open, setOpen] = useState<PeopleActionKind | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const view = usePeopleEditView(studentId, open !== null);
  const allowed = allowedPeopleActions(can);
  if (allowed.length === 0) return null;
  const done: PeopleDone = (text, removed = false) => {
    setOpen(null);
    setNotice(text);
    (removed ? onRemoved : undefined)?.();
  };
  return (
    <View style={{ gap: 8 }}>
      {notice ? <Note>{notice}</Note> : null}
      {allowed.map((kind) => (
        <Button
          key={kind}
          variant="secondary"
          label={SHEETS[kind].label}
          onPress={() => setOpen(kind)}
        />
      ))}
      <PeopleSheetHost
        sheet={open ? SHEETS[open] : null}
        view={view}
        onClose={() => setOpen(null)}
        onDone={done}
      />
    </View>
  );
}
