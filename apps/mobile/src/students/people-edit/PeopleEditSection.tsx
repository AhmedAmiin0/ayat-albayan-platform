import type { Permission, PeopleEditView } from '@ab/shared';
import { useState, type ComponentType } from 'react';
import { View } from 'react-native';
import { usePermissions } from '@/core/auth';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more';
import { Button } from '@/core/ui/primitives/Button';
import { PauseSheetFrame } from '@/students/course-pause/PauseSheetFrame';
import { AttachSheet } from './AttachSheet';
import { ConvertSheet } from './ConvertSheet';
import { EditDataSheet } from './EditDataSheet';
import { usePeopleEditView } from './people-edit-api';

const E = t.peopleEdit;
type Kind = 'edit' | 'attach' | 'convert';

/** What every sheet gets: the loaded view, close, and the success notice. */
export interface PeopleSheetProps {
  view: PeopleEditView;
  onClose: () => void;
  onDone: (notice: string) => void;
}

/** Each action, its label, its sheet and the keys it needs (the view itself is people.edit). */
const ACTIONS: { kind: Kind; label: string; needs: Permission[]; Sheet: ComponentType<PeopleSheetProps> }[] = [
  { kind: 'edit', label: E.editData, needs: ['people.edit'], Sheet: EditDataSheet },
  { kind: 'attach', label: E.attach, needs: ['people.edit', 'students.attach_guardian'], Sheet: AttachSheet },
  { kind: 'convert', label: E.convert, needs: ['people.edit', 'people.switch_role'], Sheet: ConvertSheet },
];

/**
 * «تعديل البيانات» · «ربط بولي أمر آخر» · «تحويل إلى طالب / ولي أمر» (owner 2026-11-02) in sales'
 * «تفاصيل الطالب» and the admin's student file: only the actions the role holds, each a page sheet
 * over the loaded edit view; the last success shows above the buttons.
 */
export function PeopleEditSection({ studentId }: { studentId: string }) {
  const can = usePermissions();
  const [open, setOpen] = useState<Kind | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const view = usePeopleEditView(studentId, open !== null);
  const allowed = ACTIONS.filter((a) => a.needs.every((p) => can(p)));
  if (allowed.length === 0) return null;
  const active = allowed.find((a) => a.kind === open);
  const close = () => setOpen(null);
  const done = (text: string) => {
    setOpen(null);
    setNotice(text);
  };
  return (
    <View style={{ gap: 8 }}>
      {notice ? <Note>{notice}</Note> : null}
      {allowed.map((a) => (
        <Button key={a.kind} variant="secondary" label={a.label} onPress={() => setOpen(a.kind)} />
      ))}
      <PauseSheetFrame open={active !== undefined} title={active?.label ?? ''} onClose={close}>
        {active && view.data ? <active.Sheet view={view.data} onClose={close} onDone={done} /> : null}
        {view.isError ? <Note alert>{E.errors.generic}</Note> : null}
      </PauseSheetFrame>
    </View>
  );
}
