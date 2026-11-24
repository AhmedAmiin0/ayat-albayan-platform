import { startDateEditMax, startDateEditMin } from '@ab/shared';
import { riyadhToday } from '@ab/time';
import type { QueryKey } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { DatePickerField } from '@/core/ui/form/date-picker';
import { t, Button } from '@ab/mobile-kit';
import { Note } from '@/more';
import { startDateErrorText, useStartDateEdit, type StartDatePackage } from './use-start-date-edit';

interface EditorProps {
  sub: StartDatePackage;
  /** The queries showing this package, refetched after a save. */
  stale: readonly QueryKey[];
  /** saved: true after a save that landed. */
  onDone: (saved: boolean) => void;
}

const e = t.salesMoney.startDateEdit;

/** Bounded as the server checks; save only for another day. */
export function StartDateEditor({ sub, stale, onDone }: EditorProps) {
  const today = riyadhToday();
  const [day, setDay] = useState(sub.starts_on);
  const save = useStartDateEdit(sub.id, stale);
  const max = startDateEditMax({ today, lessonsUsedBefore: sub.lessons_used_before ?? 0 });
  return (
    <View testID="start-date-editor" style={{ gap: 8 }}>
      <DatePickerField
        label={e.label}
        day={day}
        range={{ min: startDateEditMin(today), max }}
        onChange={setDay}
        error={save.isError ? startDateErrorText(save.error) : undefined}
      />
      <Note>{e.hint}</Note>
      <Button
        label={e.save}
        busy={save.isPending}
        disabled={day === sub.starts_on}
        onPress={() => save.mutate(day, { onSuccess: () => onDone(true) })}
      />
      <Button variant="ghost" label={e.cancel} onPress={() => onDone(false)} />
    </View>
  );
}
