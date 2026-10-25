import type { JoinLinkResult, LessonView } from '@ab/shared';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { Button } from '@/core/ui/primitives/Button';
import { InlineConfirm } from '@/core/ui/feedback/InlineConfirm';
import { linkError, sendJoinLink } from './link-api';

type Student = LessonView['students'][number];

/** What a resolved send says: queued (the sending gate is closed) is not «sent»; a replay says so. */
const sentNote = (r: JoinLinkResult): string =>
  r.message_status === 'queued' ? t.inbox.messagingOff : r.replayed ? t.classroom.linkResent : t.classroom.linkSent;

/**
 * «أرسل رابط الحلقة» for one student: it messages the guardian on WhatsApp, so a press asks first
 * (a double tap must not reach a family twice). A queued message (gate closed) and a failed one are told apart from «sent». The API's refusals (template not approved, 403,
 * 404, 503) read under the button; a replayed send says so.
 */
export function SendLinkAction({ lessonId, student, named }: { lessonId: string; student: Student; named: boolean }) {
  const [asking, setAsking] = useState(false);
  const send = useMutation({ mutationFn: sendJoinLink, onSettled: () => setAsking(false) });
  const label = named
    ? `${t.classroom.sendLink} ${t.classroom.sendLinkTo.replace('{name}', student.name)}`
    : t.classroom.sendLink;
  const failed = send.data?.message_status === 'failed';
  const done = send.data && !failed ? sentNote(send.data) : null;
  return (
    <View style={{ gap: 6 }}>
      {asking ? (
        <InlineConfirm
          message={t.mobileClassroom.sendConfirm.replace('{name}', student.name)}
          confirmLabel={send.isPending ? t.classroom.sendingLink : t.mobileClassroom.sendConfirmAction}
          busy={send.isPending}
          onConfirm={() => send.mutate({ lessonId, studentId: student.id })}
          onCancel={() => !send.isPending && setAsking(false)}
        />
      ) : (
        <Button variant="secondary" label={label} disabled={send.isSuccess && !failed} onPress={() => setAsking(true)} />
      )}
      {done ? <Note>{done}</Note> : null}
      {failed ? <ErrorLine message={t.mobileClassroom.sendFailed} /> : null}
      {send.isError ? <ErrorLine message={linkError(send.error)} /> : null}
    </View>
  );
}
