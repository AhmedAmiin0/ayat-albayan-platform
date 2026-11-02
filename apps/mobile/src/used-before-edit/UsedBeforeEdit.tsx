import type { QueryKey } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { useHolds } from '@/core/auth';
import { t } from '@/core/lib/i18n/i18n';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { Button } from '@/core/ui/primitives/Button';
import { Stepper } from '@/finance';
import { Note } from '@/more';
import { editErrorText, editMax, useUsedBeforeEdit, type EditablePackage } from './use-used-before-edit';

interface UsedBeforeEditProps {
  sub: EditablePackage;
  /** The queries showing this package, refetched after a save. */
  stale: readonly QueryKey[];
}

const usedOf = (sub: EditablePackage): number => sub.lessons_used_before ?? 0;

/** The open editor: − / + only (never typed), 0 … editMax, «حفظ» / «إلغاء». */
function Editor({ sub, stale, onDone }: UsedBeforeEditProps & { onDone: () => void }) {
  const m = t.salesMoney;
  const [value, setValue] = useState(usedOf(sub));
  const save = useUsedBeforeEdit(sub.id, stale);
  return (
    <View testID="used-before-editor" style={{ gap: 8 }}>
      <Stepper
        label={m.usedBefore}
        value={value}
        min={0}
        max={editMax(sub)}
        onChange={setValue}
        names={{ less: m.usedBeforeLess, more: m.usedBeforeMore }}
      />
      <Note>{m.usedBeforeEdit.hint}</Note>
      {save.isError ? <ErrorLine message={editErrorText(save.error)} /> : null}
      <Button
        label={m.usedBeforeEdit.save}
        busy={save.isPending}
        onPress={() => save.mutate(value, { onSuccess: onDone })}
      />
      <Button variant="ghost" label={m.usedBeforeEdit.cancel} onPress={onDone} />
    </View>
  );
}

/**
 * «تعديل عدد الحلقات المستخدمة» (owner 2026-11-02) on a package card, admins and assistants
 * (subscriptions.set_start_date); never on a cancelled package. The API refuses a booked course.
 */
export function UsedBeforeEdit({ sub, stale }: UsedBeforeEditProps) {
  const [open, setOpen] = useState(false);
  const canEdit = useHolds('subscriptions.set_start_date') && sub.status !== 'cancelled';
  if (!canEdit) return null;
  const close = () => setOpen(false);
  return open ? (
    <Editor sub={sub} stale={stale} onDone={close} />
  ) : (
    <Button
      variant="secondary"
      label={t.salesMoney.usedBeforeEdit.action}
      onPress={() => setOpen(true)}
    />
  );
}
