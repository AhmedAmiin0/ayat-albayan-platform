import { formatPhone } from '@ab/core';
import { CodeBoxes, Ltr, Button, FormAlert, t } from '@ab/web-kit';
import { LinkCard } from '@/features/platform/short-links-gate/parts/LinkCard';
import type { Gate } from '@/features/platform/short-links-gate/use-gate';
import type { GatePhone } from '@/features/platform/short-links-gate/use-gate-phone';
import { GATE_ACTION } from './gate-action';
import { errorText } from './gate-errors';

const G = t.shortLinks.gate;

/** The box-wide errors: the code itself is wrong or incomplete. */
const BOX_ERRORS = new Set(['invalid_code', 'code_incomplete']);
/** The countdown reads in the quiet ink, not a faded green (board LinkXGateCode). */
const RESEND = 'justify-self-center disabled:text-ink-3 disabled:opacity-100';

export function CodeScreen({ gate }: { gate: Gate }) {
  const { phone } = gate;
  const error = errorText(phone.error);
  return (
    <>
      <LinkCard title={null} />
      <form
        noValidate
        className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          phone.verify();
        }}
      >
        <div className="grid gap-0.5">
          <p className="text-sm font-semibold text-ink">{G.codeTitle}</p>
          <SentTo phone={phone} />
        </div>
        <CodeBoxes digits={phone.digits} onDigits={phone.setDigits}
          invalid={BOX_ERRORS.has(phone.error ?? '')} />
        {error && <FormAlert>{error}</FormAlert>}
        <Resend phone={phone} />
        <Button type="submit" className={GATE_ACTION} disabled={phone.verifying}>
          {phone.verifying ? G.verifying : G.verify}
        </Button>
      </form>
    </>
  );
}

function SentTo({ phone }: { phone: GatePhone }) {
  return (
    <p className="flex flex-wrap items-center gap-x-1 text-xs text-ink-2">
      {G.codeSentTo} <Ltr className="text-ink">{formatPhone(phone.sentTo ?? '')}</Ltr>
      <Button type="button" variant="ghost" size="sm" className="px-2" onClick={phone.back}>
        {G.changePhone}
      </Button>
    </p>
  );
}

function Resend({ phone }: { phone: GatePhone }) {
  const waiting = phone.resendIn > 0;
  return (
    <Button type="button" variant="ghost" size="sm" className={RESEND}
      disabled={waiting || phone.sending} onClick={phone.resend}>
      {waiting ? G.resendIn.replace('{seconds}', String(phone.resendIn)) : G.resend}
    </Button>
  );
}
