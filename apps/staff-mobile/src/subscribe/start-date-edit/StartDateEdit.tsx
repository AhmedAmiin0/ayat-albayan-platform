import type { QueryKey } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { useHolds, t, Button } from '@ab/mobile-kit';
import { Note } from '@/more';
import { StartDateEditor } from './StartDateEditor';
import type { StartDatePackage } from './use-start-date-edit';

interface StartDateEditProps {
  sub: StartDatePackage;
  /** The queries showing this package, refetched after a save. */
  stale: readonly QueryKey[];
}

type Mode = 'closed' | 'open' | 'saved';

/** Only with subscriptions.edit_terms (not set_start_date alone), never on a cancelled package. */
export function StartDateEdit({ sub, stale }: StartDateEditProps) {
  const [mode, setMode] = useState<Mode>('closed');
  const canEdit = useHolds('subscriptions.edit_terms') && sub.status !== 'cancelled';
  if (!canEdit) return null;
  const done = (saved: boolean) => setMode(saved ? 'saved' : 'closed');
  return mode === 'open' ? (
    <StartDateEditor sub={sub} stale={stale} onDone={done} />
  ) : (
    <View style={{ gap: 8 }}>
      {mode === 'saved' ? <Note>{t.salesMoney.startDateEdit.saved}</Note> : null}
      <Button
        variant="secondary"
        label={t.salesMoney.startDateEdit.action}
        onPress={() => setMode('open')}
      />
    </View>
  );
}
