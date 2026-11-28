import { useMutation } from '@tanstack/react-query';
import { Share, View } from 'react-native';
import { t, Button, ErrorLine } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { joinLinkUrl, linkError } from '@/classroom/links/link-api';
import { Dismissed } from './dismissed.error';
import { ShareFailed } from './share-failed.error';

/** A fresh short-lived URL every tap, never kept, handed to the share sheet (it has Copy). */
async function shareLink(lessonId: string): Promise<void> {
  const { url } = await joinLinkUrl(lessonId);
  const result = await Share.share({ message: url }).catch(() => {
    throw new ShareFailed();
  });
  if (result.action === Share.dismissedAction) throw new Dismissed();
}

/** Sends no WhatsApp message; Share.share carries it because clipboard is not wired here yet. */
export function CopyLinkAction({ lessonId }: { lessonId: string }) {
  const copy = useMutation({ mutationFn: shareLink });
  return (
    <View style={{ gap: 6 }}>
      <Button
        variant="secondary"
        label={copy.isPending ? t.classroom.copying : t.classroom.copyLink}
        busy={copy.isPending}
        onPress={() => copy.mutate(lessonId)}
      />
      {copy.isSuccess ? <Note>{t.classroom.linkWindow}</Note> : null}
      {copy.isError && !(copy.error instanceof Dismissed) ? (
        <ErrorLine
          message={
            copy.error instanceof ShareFailed
              ? t.mobileClassroom.linkShareFailed
              : linkError(copy.error)
          }
        />
      ) : null}
    </View>
  );
}
