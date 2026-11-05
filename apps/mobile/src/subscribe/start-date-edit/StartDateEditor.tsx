import { riyadhToday, startDateEditMax, startDateEditMin } from '@ab/shared';
import type { QueryKey } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { StartDayPicker } from '@/assistants';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
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

/**
 * The open editor: StartDayPicker from the stored day, bounded as the server checks
 * (startDateEditMin / startDateEditMax); «حفظ» only for another day.
 */
export function StartDateEditor({ sub, stale, onDone }: EditorProps) {
  const today = riyadhToday();
  const [day, setDay] = useState(sub.starts_on);
  const save = useStartDateEdit(sub.id, stale);
  const max = startDateEditMax({ today, lessonsUsedBefore: sub.lessons_used_before ?? 0 });
  return (
    <View testID="start-date-editor" style={{ gap: 8 }}>
      <StartDayPicker
        label={e.label}
        day={day}
        min={startDateEditMin(today)}
        max={max}
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
