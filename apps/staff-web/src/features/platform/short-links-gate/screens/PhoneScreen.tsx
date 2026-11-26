import { defaultStringifySearch } from '@tanstack/react-router';
import { PhoneNumberField, Button, buttonVariants, FormAlert, t } from '@ab/web-kit';
import { LinkCard } from '@/features/platform/short-links-gate/parts/LinkCard';
import type { Gate } from '@/features/platform/short-links-gate/use-gate';
import { GATE_ACTION } from './gate-action';
import { errorText } from './gate-errors';

const G = t.shortLinks.gate;

/** /login, back to this gate after sign-in (the login page honours a same-origin ?redirect=). */
const loginHref = (code: string): string =>
  `/login${defaultStringifySearch({ redirect: `/l/${code}` })}`;

/** While WhatsApp codes cannot be sent, the page says so and only signing in is left. */
export function PhoneScreen({ gate }: { gate: Gate }) {
  const { phone } = gate;
  return (
    <>
      <LinkCard title={null} />
      <div className="grid gap-2">
        <form
          noValidate
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            phone.send();
          }}
        >
          <p className="text-sm font-semibold text-ink">{G.phoneTitle}</p>
          <PhoneNumberField entry={phone.entry} hint={G.phoneHint} error={errorText(phone.error)} />
          {!gate.codesAvailable && <FormAlert>{G.errors.codes_unavailable}</FormAlert>}
          <Button type="submit" className={GATE_ACTION}
            disabled={phone.sending || !gate.codesAvailable}>
            {phone.sending ? G.sending : G.sendCode}
          </Button>
        </form>
        <a
          href={loginHref(gate.code)}
          className={buttonVariants({ variant: 'ghost', className: GATE_ACTION })}
        >
          {G.haveAccount} {G.signIn}
        </a>
      </div>
    </>
  );
}
