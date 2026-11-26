import { firstWay, OTHER_WAY, type SignInWay } from '@ab/client-core';
import { useState, type ReactNode } from 'react';
import { Button, t } from '@ab/web-kit';
import { StudentSignIn } from '@/features/sign-in/StudentSignIn';
import { WhatsAppSignIn } from '@/features/sign-in/WhatsAppSignIn';

const WAYS: Readonly<Record<SignInWay, (codes: boolean) => ReactNode>> = {
  whatsapp: () => <WhatsAppSignIn />,
  password: (codes) => <StudentSignIn codes={codes} />,
};

const SWITCH: Readonly<Record<SignInWay, () => string>> = {
  whatsapp: () => t.familyApp.signIn.withWhatsApp,
  password: () => t.familyApp.signIn.withPassword,
};

/**
 * One sign-in for guardians and students, with no tabs: WhatsApp first, the student
 * code + password one plain tap away. While WhatsApp codes are off: the password form and one
 * quiet line saying why there is no WhatsApp.
 */
export function SignInWays({ codes }: { codes: boolean }) {
  const [way, setWay] = useState<SignInWay>(firstWay(codes));
  const other = OTHER_WAY[way];
  return (
    <div className="grid gap-4">
      <div key={way} className="animate-fade-up">{WAYS[way](codes)}</div>
      {codes ? (
        <Button type="button" variant="ghost" className="justify-self-center" onClick={() => setWay(other)}>
          {SWITCH[other]()}
        </Button>
      ) : (
        <p className="text-center text-sm text-ink-3">{t.familyApp.signIn.whatsappOff}</p>
      )}
    </div>
  );
}
