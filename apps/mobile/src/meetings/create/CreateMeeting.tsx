import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { usePermissions } from '@/core/auth/use-permissions';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { CreateMeetingDone } from './CreateMeetingDone';
import { CreateMeetingForm } from './CreateMeetingForm';
import { createMeetingWith } from '@/meetings/invite/invite-api';
import { inviteError } from '@/meetings/invite/invite-text';
import { useViewerTz } from '@/core/lib/clock';

type Mode = 'instant' | 'scheduled' | null;

/** Which start buttons show (default both; only the teacher's screen passes its switches). */
export interface MeetingAllow { instant: boolean; scheduled: boolean }
const ALL: MeetingAllow = { instant: true, scheduled: true };

interface StartProps { allow: MeetingAllow; onPick: (mode: 'instant' | 'scheduled') => void }

function StartButtons({ allow, onPick }: StartProps) {
  return (
    <View style={{ gap: 8 }}>
      {allow.instant && <Button label={t.meetings.new} onPress={() => onPick('instant')} />}
      {allow.scheduled && (
        <Button variant="secondary" label={t.meetingInvites.scheduledItem} onPress={() => onPick('scheduled')} />
      )}
    </View>
  );
}

/**
 * «اجتماع جديد» (now) and «اجتماع مجدول» (a time and invitees), for every staff login holding
 * meetings.write. Then the link to share and each invitee's outcome with its own share button.
 */
export function CreateMeeting({ allow = ALL }: { allow?: MeetingAllow }) {
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
  if (!mode) return <StartButtons allow={allow} onPick={setMode} />;
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
