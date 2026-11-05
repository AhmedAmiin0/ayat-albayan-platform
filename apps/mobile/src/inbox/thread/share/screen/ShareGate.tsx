import { Redirect, router } from 'expo-router';
import { type GateStatus, useAuthGate, usePermissions } from '@/core/auth';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/core/ui/feedback/Note';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { Button } from '@/core/ui/primitives/Button';
import { shareHome, shareHref } from '@/inbox/thread/share/share-href';
import { useDropShare } from '@/inbox/thread/share/use-shared-items';

const s = t.inbox.share;

/** The classroom assistant (and a salesperson without the chats): no chat to share into. */
function NoChats({ gate }: { gate: GateStatus }) {
  useDropShare();
  return (
    <Screen>
      <ScreenHeader title={s.title} />
      <Note>{s.noChats}</Note>
      <Button label={t.common.back} onPress={() => router.dismissTo(shareHome(gate))} />
    </Screen>
  );
}

/**
 * app/share.tsx (docs/38 §mobile 2): where +native-intent sends an Android share. It replaces
 * itself with the signed-in tree's chooser, inside that tree's chat group. Signed out, the root
 * guard sends the user to the login and the share is dropped.
 */
export function ShareGate() {
  const gate = useAuthGate();
  const href = shareHref(gate, usePermissions());
  return href ? <Redirect href={href} /> : <NoChats gate={gate} />;
}
