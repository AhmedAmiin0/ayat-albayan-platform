import type { ThreadView } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { useUploadMaxBytes } from '@/core/lib/query/public-config';
import { Note } from '@/core/ui/feedback/Note';
import { Button } from '@/core/ui/primitives/Button';
import type { SharedItems } from '@/inbox/thread/share/read-share';
import { SHARE_MAX_FILES, type ShareProblem, shareProblem } from '@/inbox/thread/share/share-rules';
import { sendingText, type ShareStep } from '@/inbox/thread/share/use-share-send';
import { ForwardRow } from '@/inbox/thread/components/ForwardRow';
import { chatName } from '@/inbox/thread/hooks/forward-text';
import { isOwnThread, useThreadMode } from '@/inbox/thread/hooks/thread-mode';
import { ChatPickList } from '@/inbox/thread/pick/ChatPickList';
import { ShareFailures } from './ShareFailures';
import { SharePreview } from './SharePreview';
import { type ShareKind, shareKind, useShareGo } from './use-share-go';

const s = t.inbox.share;

const PROBLEM: Record<ShareProblem, string> = {
  empty: s.empty,
  too_many: s.tooMany.replace('{max}', String(SHARE_MAX_FILES)),
  teacher_files: s.teacherFiles,
  file_type: s.unsupported,
  file_too_large: t.inbox.error.file_too_large,
};

const ACTION_LABEL: Record<ShareKind, (name: string) => string> = {
  text: () => s.openChat,
  files: (name) => s.sendTo.replace('{name}', name),
};

function footerLabel(step: ShareStep | null, kind: ShareKind, picked: ThreadView | null): string {
  if (step) return sendingText(step);
  return picked ? ACTION_LABEL[kind](chatName(picked)) : s.pickHint;
}

/**
 * The share and the chats of this tree (the server's scope; a teacher's own academy chat left
 * out), ONE chat picked. Each row says when the chat is past its 24 h window before anything goes;
 * nothing is sent until staff press the button.
 */
export function ShareChooser({ items }: { items: SharedItems }) {
  const mode = useThreadMode();
  const maxBytes = useUploadMaxBytes();
  const [picked, setPicked] = useState<ThreadView | null>(null);
  const share = useShareGo(items);
  const problem = shareProblem({ items, teacher: mode.kind === 'teacher', maxBytes });
  const busy = share.step !== null;
  const failed = share.outcome?.failed ?? [];
  if (failed.length > 0) {
    return <ShareFailures failed={failed} step={share.step} actions={share.actions} />;
  }
  const go = () => {
    if (!picked) return;
    share.go(picked);
  };
  return (
    <View style={{ flex: 1, gap: 8 }}>
      <SharePreview items={items} />
      {problem ? <Note alert>{PROBLEM[problem]}</Note> : null}
      <ChatPickList
        testID="share-list"
        exclude={(th) => isOwnThread(mode, th)}
        extraData={picked?.phone_e164}
        renderItem={({ item }) => (
          <ForwardRow
            thread={item}
            checked={item.phone_e164 === picked?.phone_e164}
            disabled={busy}
            onToggle={setPicked}
          />
        )}
      />
      <Button
        label={footerLabel(share.step, shareKind(items), picked)}
        busy={busy}
        disabled={!picked || problem !== null}
        onPress={go}
      />
    </View>
  );
}
