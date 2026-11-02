import type { QueryKey } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { useHolds } from '@/core/auth';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { Note } from '@/more';
import { editOffered, type EditablePackage } from './use-used-before-edit';
import { UsedBeforeEditor } from './UsedBeforeEditor';

interface UsedBeforeEditProps {
  sub: EditablePackage;
  /** The queries showing this package, refetched after a save. */
  stale: readonly QueryKey[];
}

type Mode = 'closed' | 'open' | 'saved';

/**
 * «تعديل عدد الحلقات المستخدمة» (owner 2026-11-02) on the student's current package, admins and
 * assistants (subscriptions.set_start_date); never on a cancelled package (editOffered). The
 * editor reads the server's state (max, booked course) before offering anything.
 */
export function UsedBeforeEdit({ sub, stale }: UsedBeforeEditProps) {
  const [mode, setMode] = useState<Mode>('closed');
  const canEdit = useHolds('subscriptions.set_start_date') && editOffered(sub);
  if (!canEdit) return null;
  const done = (saved: boolean) => setMode(saved ? 'saved' : 'closed');
  return mode === 'open' ? (
    <UsedBeforeEditor id={sub.id} stale={stale} onDone={done} />
  ) : (
    <View style={{ gap: 8 }}>
      {mode === 'saved' ? <Note>{t.salesMoney.usedBeforeEdit.saved}</Note> : null}
      <Button
        variant="secondary"
        label={t.salesMoney.usedBeforeEdit.action}
        onPress={() => setMode('open')}
      />
    </View>
  );
}
