import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Share, View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { apiSend } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { SectionLabel } from '@/students/list/SectionLabel';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { InlineConfirm } from '@/core/ui/feedback/InlineConfirm';

const J = t.mobileStudentFile.joinLink;

/** POST /students/:id/join-link: the new link (it rotates the old one, so the admin confirms first), then shared. */
function issueJoinLink(studentId: string): Promise<{ url: string }> {
  return apiSend<{ url: string }>('POST', `/students/${studentId}/join-link`);
}

/**
 * «رابط دخول الطالب» (web: StudentJoinLink): there is no clipboard module, so the link goes through
 * the system share sheet. Only the hash is stored and the old link is already revoked, so the new
 * link stays on screen (selectable, with a re-share button) until the card goes away.
 */
export function JoinLinkCard({ studentId, studentName }: { studentId: string; studentName: string }) {
  const [asking, setAsking] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [shareFailed, setShareFailed] = useState(false);
  const share = async (link: string) => {
    setShareFailed(false);
    try {
      await Share.share({ message: J.share.replace('{name}', studentName).replace('{url}', link) });
    } catch {
      setShareFailed(true);
    }
  };
  const make = useMutation({
    mutationFn: () => issueJoinLink(studentId),
    onSuccess: (made) => {
      setUrl(made.url);
      void share(made.url);
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
      {url ? (
        <View style={{ gap: 6, alignItems: 'flex-start' }}>
          <Note>{J.newLink}</Note>
          <AppText selectable style={{ writingDirection: 'ltr' }}>{url}</AppText>
          <Button variant="secondary" label={J.shareAgain} onPress={() => void share(url)} />
        </View>
      ) : null}
      {shareFailed ? <ErrorLine message={J.shareFailed} /> : null}
    </View>
  );
}
