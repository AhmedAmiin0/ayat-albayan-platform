import type { AssistantView } from '@ab/schedule';
import { useState } from 'react';
import { View } from 'react-native';
import { t, Button, ListRow, InsetGroup } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';

const A = t.classroom.assistants;

export function AssistantPicker({
  free,
  onPick,
}: {
  free: readonly AssistantView[];
  onPick: (profileId: string) => void;
}) {
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
