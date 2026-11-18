import type { PhoneState } from '@ab/client-core';
import { PhoneNumberField } from '@ab/web-kit/auth/phone/PhoneNumberField';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { pill } from '@ab/web-kit/components/family/brand/pill';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { cn } from '@ab/web-kit/lib/utils';
import { CardHeading } from './CardHeading';
import type { WhatsAppSignIn } from './use-whatsapp-sign-in';

/** The line under the number while it is typed: the hint, or why it cannot be a number. */
const UNDER: Readonly<Record<PhoneState, () => string | undefined>> = {
  empty: () => undefined,
  typing: () => undefined,
  ok: () => undefined,
  bad: () => t.familyApp.signIn.phoneBad,
};

/**
 * The WhatsApp number as the family app (#752, board PortalWebSignIn): «تسجيل الدخول» and who
 * it is for, the kit's number field (country + national number), then the gold «أرسل الرمز»
 * once it is a number.
 */
export function PhoneStep({ sign }: { sign: WhatsAppSignIn }) {
  const error = UNDER[sign.check.state]() ?? sign.flow.error;
  return (
    <form
      noValidate
      className="grid gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        sign.send();
      }}
    >
      <CardHeading title={t.auth.loginTitle}>{t.familyAuth.familyIntro}</CardHeading>
      <PhoneNumberField entry={sign.entry} hint={t.familyApp.signIn.phoneHint} error={error} />
      <button
        type="submit"
        disabled={sign.flow.busy || sign.check.state !== 'ok'}
        className={cn(pill({ tone: 'gold', size: 'lg' }), 'min-h-[52px] w-full font-extrabold')}
      >
        <Icon name="chat" />
        {sign.flow.busy ? t.familyAuth.sending : t.familyAuth.sendCode}
      </button>
    </form>
  );
}
