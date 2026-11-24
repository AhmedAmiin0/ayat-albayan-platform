import { Button } from '@ab/web-kit/components/ui/form/button';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { LinkCard } from '@/features/platform/short-links-gate/parts/LinkCard';
import { SignOutLine } from '@/features/platform/short-links-gate/parts/SignOutLine';
import type { Gate } from '@/features/platform/short-links-gate/use-gate';
import { GATE_ACTION } from './gate-action';

const G = t.shortLinks.gate;

export function SignedInScreen({ gate }: { gate: Gate }) {
  return (
    <>
      <LinkCard title={gate.title} />
      <div className="grid gap-2">
        <Button type="button" className={GATE_ACTION} disabled={gate.opening} onClick={gate.open}>
          <span>
            {G.continueAs} <bdi>{gate.name}</bdi>
          </span>
        </Button>
        {gate.openFailed && <FormAlert>{G.errors.generic}</FormAlert>}
        <SignOutLine onSignOut={gate.signOut} />
      </div>
    </>
  );
}
