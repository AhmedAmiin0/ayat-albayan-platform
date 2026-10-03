import type { TeacherEarningsView } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { Button } from '@/ui/Button';
import { PaySheet } from './PaySheet';
import { selectedDue } from './selection';
import { egp } from './text';

export interface PayBarProps {
  base: string;
  view: TeacherEarningsView;
  /** Ticked session ids; none = pay across every open session. */
  selected: readonly string[];
  onPaid: () => void;
}

/**
 * The pay action under the sessions: the ticked total («المتبقي في الحلقات المختارة») and the button
 * that opens the sheet. Nothing ticked = every open session (what the API does without earningIds).
 */
export function PayBar({ base, view, selected, onPaid }: PayBarProps) {
  const [open, setOpen] = useState(false);
  const ticked = selected.filter((id) => view.sessions.some((s) => s.id === id));
  const some = ticked.length > 0;
  const due = some ? selectedDue(view.sessions, ticked) : view.balance.outstanding;
  return (
    <View style={{ gap: 8 }}>
      {some ? <Note>{t.teacherEarnings.selectedDue.replace('{amount}', egp(due))}</Note> : null}
      <Button
        label={some ? t.teacherEarnings.paySelected.replace('{n}', String(ticked.length)) : t.teacherEarnings.pay}
        disabled={due <= 0}
        onPress={() => setOpen(true)}
      />
      <PaySheet
        open={open}
        base={base}
        due={due}
        {...(some ? { earningIds: ticked } : {})}
        onDone={onPaid}
        onClose={() => setOpen(false)}
      />
    </View>
  );
}
