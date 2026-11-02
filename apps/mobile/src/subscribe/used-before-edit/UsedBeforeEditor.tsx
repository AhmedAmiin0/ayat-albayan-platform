import type { UsedBeforeState } from '@ab/shared';
import type { QueryKey } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { Button } from '@/core/ui/primitives/Button';
import { Stepper } from '@/finance';
import { Note } from '@/more';
import { editErrorText, useUsedBeforeEdit, useUsedBeforeState } from './use-used-before-edit';

interface EditorProps {
  id: string;
  /** The queries showing this package, refetched after a save. */
  stale: readonly QueryKey[];
  /** saved: true after a save that landed. */
  onDone: (saved: boolean) => void;
}

const e = t.salesMoney.usedBeforeEdit;

/** The stepper from the server's state: starts at min(stored, max), «حفظ» only for a change. */
function Form({ state, stale, onDone }: Omit<EditorProps, 'id'> & { state: UsedBeforeState }) {
  const m = t.salesMoney;
  const stored = state.lessons_used_before;
  const [value, setValue] = useState(Math.min(stored, state.max));
  const save = useUsedBeforeEdit(state.subscription_id, stale);
  return (
    <>
      <Note>{e.current.replace('{n}', String(stored))}</Note>
      <Stepper
        label={m.usedBefore}
        value={value}
        min={0}
        max={state.max}
        onChange={setValue}
        names={{ less: m.usedBeforeLess, more: m.usedBeforeMore }}
      />
      <Note>{e.hint}</Note>
      {save.isError ? <ErrorLine message={editErrorText(save.error)} /> : null}
      <Button
        label={e.save}
        busy={save.isPending}
        disabled={value === stored}
        onPress={() => save.mutate(value, { onSuccess: () => onDone(true) })}
      />
    </>
  );
}

/** The open editor: the server's state first; a blocked package says why, with «إلغاء» only. */
export function UsedBeforeEditor({ id, stale, onDone }: EditorProps) {
  const state = useUsedBeforeState(id);
  const blocked = state.data?.blocked ?? null;
  return (
    <View testID="used-before-editor" style={{ gap: 8 }}>
      {state.isError ? <ErrorLine message={e.errors.generic} /> : null}
      {blocked ? <Note>{e.errors[blocked]}</Note> : null}
      {state.data && !blocked ? <Form state={state.data} stale={stale} onDone={onDone} /> : null}
      <Button variant="ghost" label={e.cancel} onPress={() => onDone(false)} />
    </View>
  );
}
