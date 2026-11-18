import { firstWay, OTHER_WAY, type SignInWay } from '@ab/client-core';
import { useState, type ReactNode } from 'react';
import { Icon, type IconName } from '@ab/web-kit/components/ui/display/icon';
import { pill } from '@ab/web-kit/family/brand/pill';
import { OrDivider } from '@ab/web-kit/family/sign-in/OrDivider';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { cn } from '@ab/web-kit/lib/utils';
import { StudentSignIn } from './StudentSignIn';
import { WhatsAppSignIn } from './WhatsAppSignIn';

const WAYS: Readonly<Record<SignInWay, (codes: boolean) => ReactNode>> = {
  whatsapp: () => <WhatsAppSignIn />,
  password: (codes) => <StudentSignIn codes={codes} />,
};

/** The outline pill to the other way: its words and its icon (boards: chat, padlock). */
const SWITCH: Readonly<Record<SignInWay, { label: () => string; icon: IconName }>> = {
  whatsapp: { label: () => t.familyApp.signIn.withWhatsApp, icon: 'chat' },
  password: { label: () => t.familyApp.signIn.withPassword, icon: 'lock' },
};

/**
 * One sign-in for guardians and students (owner 2026-11-15, no tabs): WhatsApp first, then «أو»
 * and the student code + password as an outline pill one tap away. While WhatsApp codes are off:
 * the password form and one quiet line saying why there is no WhatsApp.
 */
export function SignInWays({ codes }: { codes: boolean }) {
  const [way, setWay] = useState<SignInWay>(firstWay(codes));
  const other = SWITCH[OTHER_WAY[way]];
  return (
    <div className="grid gap-6">
      <div key={way} className="animate-fade-up">{WAYS[way](codes)}</div>
      {codes ? (
        <>
          <OrDivider />
          <button type="button" onClick={() => setWay(OTHER_WAY[way])}
            className={cn(pill({ tone: 'outline' }), 'min-h-12 w-full font-extrabold')}>
            <Icon name={other.icon} />
            {other.label()}
          </button>
        </>
      ) : (
        <p className="text-center text-sm text-ink-3">{t.familyApp.signIn.whatsappOff}</p>
      )}
    </div>
  );
}
