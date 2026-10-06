import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { usePermissions } from '@/auth/use-permissions';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/lib/i18n';
import { Button } from '@/ui/Button';
import { Field } from '@/ui/Field';
import { createMeeting } from './api';
import { MeetingLinkShare } from './MeetingLinkShare';
import { useEnterMeeting } from './use-enter-meeting';

const L = t.meetings.internal;

/** «اجتماع جديد»: an optional title (the web form has no more), then the link to share and «ادخل الاجتماع». */
export function CreateMeeting() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const client = useQueryClient();
  const create = useMutation({
    mutationFn: createMeeting,
    onSuccess: () => client.invalidateQueries({ queryKey: ['meetings'] }),
  });
  const enter = useEnterMeeting();
  const can = usePermissions();
  if (!can('meetings.write')) return null;
  if (!open) return <Button label={t.meetings.new} onPress={() => setOpen(true)} />;
  const made = create.data;
  return (
    <View style={{ gap: 12 }}>
      {made ? (
        <>
          <MeetingLinkShare url={made.url} note={L.ready} />
          <Button label={L.enter} busy={enter.pending} onPress={() => enter.run(made.id)} />
          {enter.error ? <ErrorLine message={enter.error} /> : null}
          <Button variant="ghost" label={t.common.close} onPress={() => { setOpen(false); setTitle(''); create.reset(); }} />
        </>
      ) : (
        <>
          <Field label={L.title} value={title} maxLength={60} placeholder={L.titlePlaceholder} onChangeText={setTitle} />
          <Button label={create.isPending ? L.creating : L.create} busy={create.isPending} onPress={() => create.mutate(title)} />
          <Button variant="ghost" label={t.common.cancel} onPress={() => setOpen(false)} />
          {create.isError ? <ErrorLine message={L.error} /> : null}
        </>
      )}
    </View>
  );
}
