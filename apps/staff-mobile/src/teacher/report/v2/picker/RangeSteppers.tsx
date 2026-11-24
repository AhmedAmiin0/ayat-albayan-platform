import type { Dispatch, SetStateAction } from 'react';
import { View } from 'react-native';
import { t } from '@ab/mobile-kit';
import { AyahStepper } from './AyahStepper';
import { setBound, type PendingText, type PickerDraft } from './picker-state';

interface RangeSteppersProps {
  draft: PickerDraft;
  setDraft: Dispatch<SetStateAction<PickerDraft>>;
  /** Each end's unapplied digits ('' once applied) are applied by done. */
  setTyped: Dispatch<SetStateAction<PendingText>>;
}

const ENDS = ['from', 'to'] as const;

/** Disabled while no surah is picked. */
export function RangeSteppers({ draft, setDraft, setTyped }: RangeSteppersProps) {
  const p = t.reports.v2.picker;
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      {ENDS.map((end) => (
        <AyahStepper
          key={end}
          label={p[end]}
          value={draft[end]}
          onChange={(value) => setDraft((d) => setBound(d, { end, value }))}
          onPending={(text) => setTyped((d) => ({ ...d, [end]: text ?? '' }))}
          disabled={draft.surah === null}
        />
      ))}
    </View>
  );
}
