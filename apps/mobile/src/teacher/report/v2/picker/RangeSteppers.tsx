import type { Dispatch, SetStateAction } from 'react';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { AyahStepper } from './AyahStepper';
import { setBound, type PendingText, type PickerDraft } from './picker-state';

interface RangeSteppersProps {
  draft: PickerDraft;
  setDraft: Dispatch<SetStateAction<PickerDraft>>;
  /** Each end's digits typed and not yet applied ('' once applied): «تمّ» applies them. */
  setTyped: Dispatch<SetStateAction<PendingText>>;
}

const ENDS = ['from', 'to'] as const;

/** «من الآية» / «إلى الآية»: the range's two steppers, disabled while no surah is picked. */
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
