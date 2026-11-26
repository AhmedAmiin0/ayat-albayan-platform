import { useMutation } from '@tanstack/react-query';
import { Share, View } from 'react-native';
import { t, Button, ErrorLine } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { joinLinkUrl, linkError } from './link-api';

/** A fresh URL every tap (it is a short-lived secret: never kept), handed to the share sheet, which has Copy. */
class ShareFailed extends Error {}
class Dismissed extends Error {}

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
