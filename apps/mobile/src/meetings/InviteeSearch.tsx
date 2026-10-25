import type { MeetingInviteeKind } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { Button } from '@/core/ui/primitives/Button';
import { SearchField } from '@/core/ui/form/SearchField';
import { useInviteeOptions } from './invite-api';
import { fromOption, type DraftInvitee } from './invitee-draft';

const L = t.meetingInvites;

export interface InviteeSearchProps {
  kind: Exclude<MeetingInviteeKind, 'phone'>;
  onAdd: (d: DraftInvitee) => void;
  /** Already 30: the results show, but none can be added. */
  disabled: boolean;
}

/** «الفريق» / «الطلاب»: search by name (or a student's code), then tap a result to invite it. */
export function InviteeSearch({ kind, onAdd, disabled }: InviteeSearchProps) {
  const [q, setQ] = useState('');
  const options = useInviteeOptions(q);
  const shown = (options.data ?? []).filter((o) => o.kind === kind).map(fromOption);
  return (
    <View style={{ gap: 8 }}>
      <SearchField label={L.search} onSearch={setQ} />
      {options.isSuccess && shown.length === 0 ? <Note>{L.noOptions}</Note> : null}
      {shown.map((d) => (
        <Button key={d.key} variant="secondary" label={d.label} disabled={disabled} onPress={() => onAdd(d)} />
      ))}
    </View>
  );
}
