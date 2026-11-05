import type { ThreadView } from '@ab/shared';
import { type Href, router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { useUploadMaxBytes } from '@/core/lib/query/public-config';
import { inTree, useTreeBase } from '@/core/nav/tree-base';
import { Note } from '@/core/ui/feedback/Note';
import { Button } from '@/core/ui/primitives/Button';
import { appendComposerText } from '@/inbox/composer/draft-store';
import type { SharedFile, SharedItems } from '@/inbox/share/read-share';
import { SHARE_MAX_FILES, type ShareProblem, shareProblem } from '@/inbox/share/share-rules';
import { type ShareStep, useShareSend } from '@/inbox/share/use-share-send';
import { ForwardRow } from '@/inbox/thread/components/ForwardRow';
import { chatName } from '@/inbox/thread/hooks/forward-text';
import { isOwnThread, threadLink, useThreadMode } from '@/inbox/thread/hooks/thread-mode';
import { ChatPickList } from '@/inbox/thread/pick/ChatPickList';
import { ShareFailures } from './ShareFailures';
import { SharePreview } from './SharePreview';

const s = t.inbox.share;

const PROBLEM: Record<ShareProblem, string> = {
  empty: s.empty,
  too_many: s.tooMany.replace('{max}', String(SHARE_MAX_FILES)),
  teacher_files: s.teacherFiles,
  file_type: s.unsupported,
  file_too_large: t.inbox.error.file_too_large,
};

const sendingText = (step: ShareStep) =>
  s.sending.replace('{n}', String(step.done)).replace('{m}', String(step.total));

type Kind = 'text' | 'files';

const ACTION_LABEL: Record<Kind, (name: string) => string> = {
  text: () => s.openChat,
  files: (name) => s.sendTo.replace('{name}', name),
};

function footerLabel(step: ShareStep | null, kind: Kind, picked: ThreadView | null): string {
  if (step) return sendingText(step);
  return picked ? ACTION_LABEL[kind](chatName(picked)) : s.pickHint;
}

/**
 * The share and the chats of this tree (the server's scope; a teacher's own academy chat left
 * out). Text lands in the picked chat's box (its 24 h notes show there) and the chat opens: staff
 * press send. Files go one by one through the chat's file send, then the chat opens; a failure keeps
 * the chooser with each failed file, «إعادة المحاولة» and «فتح المحادثة».
 */
export function ShareChooser({ items }: { items: SharedItems }) {
  const mode = useThreadMode();
  const base = useTreeBase();
  const maxBytes = useUploadMaxBytes();
  const [picked, setPicked] = useState<ThreadView | null>(null);
  const sender = useShareSend();
  const kind: Kind = items.files.length > 0 ? 'files' : 'text';
  const problem = shareProblem({ items, teacher: mode.kind === 'teacher', maxBytes });
  const openChat = (phone: string) => router.replace(inTree(base, threadLink(phone, mode) as Href));
  const sendFiles = async (phone: string, files: readonly SharedFile[]) => {
    const failed = await sender.send(phone, files);
    if (failed.length === 0) openChat(phone);
  };
  const ACT: Record<Kind, (phone: string) => void> = {
    text: (phone) => {
      appendComposerText(phone, items.text);
      openChat(phone);
    },
    files: (phone) => void sendFiles(phone, items.files),
  };
  const go = () => {
    if (!picked) return;
    ACT[kind](picked.phone_e164);
  };
  const outcome = sender.outcome;
  if (outcome && outcome.failed.length > 0) {
    const retry = () => void sendFiles(outcome.phone, outcome.failed.map((f) => f.item));
    const open = () => openChat(outcome.phone);
    return <ShareFailures failed={outcome.failed} step={sender.step} actions={{ retry, open }} />;
  }
  const busy = sender.step !== null;
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
        label={footerLabel(sender.step, kind, picked)}
        busy={busy}
        disabled={!picked || problem !== null}
        onPress={go}
      />
    </View>
  );
}
