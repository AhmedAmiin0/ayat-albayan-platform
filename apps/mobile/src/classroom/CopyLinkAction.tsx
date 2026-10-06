import { useMutation } from '@tanstack/react-query';
import { Share, View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { Button } from '@/ui/Button';
import { joinLinkUrl, linkError } from './link-api';

/** A fresh URL every tap (it is a short-lived secret: never kept), handed to the share sheet, which has Copy. */
class ShareFailed extends Error {}

async function shareLink(lessonId: string): Promise<void> {
  const { url } = await joinLinkUrl(lessonId);
  await Share.share({ message: url }).catch(() => {
    throw new ShareFailed();
  });
}

/** «انسخ رابط الطالب»: no WhatsApp message is sent; there is no clipboard module, so Share.share carries it. */
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
      {copy.isError ? <ErrorLine message={copy.error instanceof ShareFailed ? t.mobileClassroom.linkShareFailed : linkError(copy.error)} /> : null}
    </View>
  );
}
