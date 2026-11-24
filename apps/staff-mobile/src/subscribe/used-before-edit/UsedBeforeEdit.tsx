import type { QueryKey } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { useHolds, t, Button } from '@ab/mobile-kit';
import { Note } from '@/more';
import { editOffered, type EditablePackage } from './use-used-before-edit';
import { UsedBeforeEditor } from './UsedBeforeEditor';

interface UsedBeforeEditProps {
  sub: EditablePackage;
  /** The queries showing this package, refetched after a save. */
  stale: readonly QueryKey[];
}

type Mode = 'closed' | 'open' | 'saved';

/** Needs subscriptions.edit_terms; never on a cancelled package. */
export function UsedBeforeEdit({ sub, stale }: UsedBeforeEditProps) {
  const [mode, setMode] = useState<Mode>('closed');
  const canEdit = useHolds('subscriptions.edit_terms') && editOffered(sub);
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
