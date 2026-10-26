import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { usePermissions } from '@/auth/use-permissions';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { CreateMeetingDone } from './CreateMeetingDone';
import { CreateMeetingForm } from './CreateMeetingForm';
import { createMeetingWith } from '../invite/invite-api';
import { inviteError } from '../invite/invite-text';
import { useViewerTz } from '../manage/use-viewer-tz';

type Mode = 'instant' | 'scheduled' | null;

/**
 * «اجتماع جديد» (now) and «اجتماع مجدول» (a time and invitees), for every staff login holding
 * meetings.write. Then the link to share and each invitee's outcome with its own share button.
 */
export function CreateMeeting() {
  const [mode, setMode] = useState<Mode>(null);
  const client = useQueryClient();
  const create = useMutation({
    mutationFn: createMeetingWith,
    onSuccess: () => client.invalidateQueries({ queryKey: ['meetings'] }),
  });
  const tz = useViewerTz();
  const can = usePermissions();
  if (!can('meetings.write')) return null;
  const close = () => {
    setMode(null);
    create.reset();
  };
  if (!mode) {
    return (
      <View style={{ gap: 8 }}>
        <Button label={t.meetings.new} onPress={() => setMode('instant')} />
        <Button variant="secondary" label={t.meetingInvites.scheduledItem} onPress={() => setMode('scheduled')} />
      </View>
    );
  }
  if (create.data) return <CreateMeetingDone made={create.data} instant={mode === 'instant'} onClose={close} />;
  return (
    <CreateMeetingForm
      key={mode}
      scheduled={mode === 'scheduled'}
      tz={tz}
      busy={create.isPending}
      error={create.isError ? inviteError(create.error, t.meetings.internal.error) : null}
      onSubmit={(body) => create.mutate(body)}
      onCancel={close}
    />
  );
}
