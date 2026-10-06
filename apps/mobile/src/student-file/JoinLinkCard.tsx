import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Share, View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { apiSend } from '@/lib/api';
import { t } from '@/lib/i18n';
import { SectionLabel } from '@/students/SectionLabel';
import { Button } from '@/ui/Button';
import { InlineConfirm } from '@/ui/InlineConfirm';
import { Note } from '@/more/Note';

const J = t.mobileStudentFile.joinLink;

/** POST /students/:id/join-link: the new link (it rotates the old one, so the admin confirms first), then shared. */
export function issueJoinLink(studentId: string): Promise<{ url: string }> {
  return apiSend<{ url: string }>('POST', `/students/${studentId}/join-link`);
}

/**
 * «رابط دخول الطالب» (web: StudentJoinLink): there is no clipboard module, so the link goes through
 * the system share sheet (WhatsApp, messages, copy from there). Only the hash is stored: it can't be shown again.
 */
export function JoinLinkCard({ studentId, studentName }: { studentId: string; studentName: string }) {
  const [asking, setAsking] = useState(false);
  const make = useMutation({
    mutationFn: async () => {
      const { url } = await issueJoinLink(studentId);
      await Share.share({ message: J.share.replace('{name}', studentName).replace('{url}', url) });
    },
    onSettled: () => setAsking(false),
  });
  return (
    <View style={{ gap: 6 }}>
      <SectionLabel>{J.title}</SectionLabel>
      <Note>{J.hint}</Note>
      {asking ? (
        <InlineConfirm
          message={J.confirm}
          confirmLabel={make.isPending ? J.creating : J.confirmAction}
          busy={make.isPending}
          onConfirm={() => make.mutate()}
          onCancel={() => setAsking(false)}
        />
      ) : (
        <View style={{ alignItems: 'flex-start' }}>
          <Button variant="secondary" label={J.create} onPress={() => setAsking(true)} />
        </View>
      )}
      {make.isError ? <ErrorLine message={J.error} /> : null}
    </View>
  );
}
