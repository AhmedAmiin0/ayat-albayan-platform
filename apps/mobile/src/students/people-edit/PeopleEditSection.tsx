import { allowedPeopleActions, type PeopleActionKind, type PeopleDone } from '@ab/client-core';
import { useState } from 'react';
import { View } from 'react-native';
import { usePermissions } from '@/core/auth';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more';
import { Button } from '@/core/ui/primitives/Button';
import { AttachSheet } from './attach/AttachSheet';
import { ConvertSheet } from './convert/ConvertSheet';
import { EditDataSheet } from './EditDataSheet';
import { usePeopleEditView } from './people-edit-api';
import { PeopleSheetHost, type PeopleSheetEntry } from './PeopleSheetHost';

const E = t.peopleEdit;

export type { PeopleSheetProps } from './PeopleSheetHost';

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
