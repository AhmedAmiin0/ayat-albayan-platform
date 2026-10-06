import type { LessonView } from '@ab/shared';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { Button } from '@/ui/Button';
import { InlineConfirm } from '@/ui/InlineConfirm';
import { linkError, sendJoinLink } from './link-api';

type Student = LessonView['students'][number];

/**
 * «أرسل رابط الحلقة» for one student: it messages the guardian on WhatsApp, so a press asks first
 * (a double tap must not reach a family twice). The API's refusals (template not approved, 403,
 * 404, 503) read under the button; a replayed send says so.
 */
export function SendLinkAction({ lessonId, student, named }: { lessonId: string; student: Student; named: boolean }) {
  const [asking, setAsking] = useState(false);
  const send = useMutation({ mutationFn: sendJoinLink, onSettled: () => setAsking(false) });
  const label = named
    ? `${t.classroom.sendLink} ${t.classroom.sendLinkTo.replace('{name}', student.name)}`
    : t.classroom.sendLink;
  const done = send.data ? (send.data.replayed ? t.classroom.linkResent : t.classroom.linkSent) : null;
  return (
    <View style={{ gap: 6 }}>
      {asking ? (
        <InlineConfirm
          message={t.mobileClassroom.sendConfirm.replace('{name}', student.name)}
          confirmLabel={send.isPending ? t.classroom.sendingLink : t.mobileClassroom.sendConfirmAction}
          busy={send.isPending}
          onConfirm={() => send.mutate({ lessonId, studentId: student.id })}
          onCancel={() => setAsking(false)}
        />
      ) : (
        <Button variant="secondary" label={label} disabled={send.isSuccess} onPress={() => setAsking(true)} />
      )}
      {done ? <Note>{done}</Note> : null}
      {send.isError ? <ErrorLine message={linkError(send.error)} /> : null}
    </View>
  );
}
