import { router } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { inTree, useTreeBase } from '@/core/nav/tree-base';
import { Note } from '@/core/ui/feedback/Note';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { Button } from '@/core/ui/primitives/Button';
import { type ShareRead, useSharedItems } from '@/inbox/thread/share/use-shared-items';
import { threadBase, useThreadMode } from '@/inbox/thread/hooks/thread-mode';
import { ShareChooser } from './ShareChooser';

const s = t.inbox.share;

/** Reading, or the read failed (the grant is gone, reopened from Recents): back to the chats. */
function NotReady({ failed }: { failed: boolean }) {
  const list = inTree(useTreeBase(), threadBase(useThreadMode()));
  const back = () => (router.canGoBack() ? router.back() : router.replace(list));
  return (
    <>
      <Note alert={failed}>{failed ? s.readFailed : s.preparing}</Note>
      {failed ? <Button variant="secondary" label={t.common.back} onPress={back} /> : null}
    </>
  );
}

function ShareBody({ read }: { read: ShareRead }) {
  if (read.status === 'ready') return <ShareChooser items={read.items} />;
  return <NotReady failed={read.status === 'error'} />;
}

/**
 * «مشاركة إلى…» (docs/38 §mobile 7), one per chat group (app/(admin-chat)/inbox/share and the sales
 * and teacher copies): what was shared, then ONE chat of this tree. Nothing is sent without a tap.
 */
export function ShareScreen() {
  const read = useSharedItems();
  return (
    <Screen>
      <ScreenHeader title={s.title} />
      <ShareBody read={read} />
    </Screen>
  );
}
