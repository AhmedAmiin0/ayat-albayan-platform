import type { AssistantView } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/core/ui/feedback/Note';
import { Button } from '@/core/ui/primitives/Button';
import { ListRow } from '@/core/ui/layout/ListRow';
import { InsetGroup } from '@/core/ui/surface/inset';

const A = t.classroom.assistants;

/** «أضف مساعدًا/ة»: opens the list of the assistants not yet on the student; a tap assigns one. */
export function AssistantPicker({ free, onPick }: { free: readonly AssistantView[]; onPick: (profileId: string) => void }) {
  const [open, setOpen] = useState(false);
  if (free.length === 0) return <Note>{A.noneAvailable}</Note>;
  return (
    <View style={{ gap: 8 }}>
      <Button variant="secondary" label={open ? t.common.cancel : A.add} onPress={() => setOpen(!open)} />
      {open ? (
        <InsetGroup>
          {free.map((a) => (
            <ListRow
              key={a.profile_id}
              title={a.full_name}
              onPress={() => {
                setOpen(false);
                onPick(a.profile_id);
              }}
            />
          ))}
        </InsetGroup>
      ) : null}
    </View>
  );
}
