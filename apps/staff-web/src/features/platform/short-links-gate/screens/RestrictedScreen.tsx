import { Button } from '@ab/web-kit/components/ui/form/button';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { SignOutLine } from '@/features/platform/short-links-gate/parts/SignOutLine';
import { StatusCard } from '@/features/platform/short-links-gate/parts/StatusCard';
import type { Gate } from '@/features/platform/short-links-gate/use-gate';
import { GATE_ACTION } from './gate-action';

/** The link is for listed people only; a signed-in visitor may sign out and retry as another. */
export function RestrictedScreen({ gate }: { gate: Gate }) {
  return (
    <>
      <StatusCard kind="restricted" />
      <div className="grid gap-2">
        <Button type="button" className={GATE_ACTION} onClick={gate.otherPhone}>
          {t.shortLinks.gate.otherPhone}
        </Button>
        {gate.signedIn && <SignOutLine onSignOut={gate.signOut} />}
      </div>
    </>
  );
}
