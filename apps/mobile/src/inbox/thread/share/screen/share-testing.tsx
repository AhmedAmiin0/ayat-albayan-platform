import type { ThreadView } from '@ab/shared';
import { type TreeBase, TreeBaseProvider } from '@/core/nav/tree-base';
import { thread } from '@/inbox/shared/thread-fixtures';
import { type ThreadMode, ThreadModeProvider } from '@/inbox/thread/hooks/thread-mode';
import { renderWithQuery } from '@/test/query';
import { ShareScreen } from './ShareScreen';

// The share chooser's tests: two families' chats and the teacher's own academy chat (test numbers).

export const FAMILY = '+201000000001';
const OTHER = '+201000000002';
const OWN = '+201000000009';

const chats: ThreadView[] = [
  { ...thread, phone_e164: FAMILY, display_name: 'أم سارة', lead_id: null },
  { ...thread, phone_e164: OTHER, display_name: 'أبو خالد', lead_id: null },
  { ...thread, phone_e164: OWN, display_name: 'المعلمة نور', teacher_id: 't-1', lead_id: null },
];

export const TEACHER: ThreadMode = { kind: 'teacher', teacherId: 't-1' };

/** GET /threads answers the three chats; anything else nothing. */
export const answerThreads = (path: string): unknown =>
  path.startsWith('/threads') ? { items: chats, total: chats.length, page: 1, pageSize: 25 } : null;

/** The chooser in a tree: the admin's by default, '/sales' or teacher mode as its group gives. */
export function renderShare(opts: { mode?: ThreadMode; base?: TreeBase } = {}) {
  return renderWithQuery(
    <TreeBaseProvider value={opts.base ?? ''}>
      <ThreadModeProvider value={opts.mode ?? { kind: 'admin' }}>
        <ShareScreen />
      </ThreadModeProvider>
    </TreeBaseProvider>,
  );
}

/** A resolved file payload as expo-sharing's getResolvedSharedPayloadsAsync gives it. */
export const resolvedPdf = (name: string) => ({
  value: `content://provider/${name}`,
  shareType: 'file',
  contentUri: `file:///data/cache/share-${name}`,
  contentType: 'file',
  contentMimeType: 'application/pdf',
  originalName: name,
  contentSize: 2048,
});
