import type { SavedReply } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { InlineConfirm } from '@/core/ui/feedback/InlineConfirm';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { useDeleteReply } from '@/inbox/saved-replies/hooks/api';
import { replyError } from '@/inbox/saved-replies/lib/reply-error';

/** «حذف الرد …؟» under its row: the reply and its file go for good; sent messages stay. */
export function DeleteConfirm({ reply, onDone }: { reply: SavedReply; onDone: () => void }) {
  const remove = useDeleteReply();
  return (
    <View style={{ gap: 6, paddingHorizontal: 16, paddingVertical: 8 }}>
      <InlineConfirm
        tone="danger"
        message={`${t.savedReplies.deleteTitle.replace('{title}', reply.title)}. ${t.savedReplies.deleteConfirm}`}
        confirmLabel={t.savedReplies.deleteYes}
        busy={remove.isPending}
        onConfirm={() => remove.mutate(reply.id, { onSuccess: onDone })}
        onCancel={onDone}
      />
      {remove.isError ? <ErrorLine message={replyError(remove.error)} /> : null}
    </View>
  );
}
