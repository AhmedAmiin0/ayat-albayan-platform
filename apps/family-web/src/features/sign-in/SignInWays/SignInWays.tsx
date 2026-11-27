import { Button, t } from '@ab/web-kit';
import { StudentSignIn } from '@/features/sign-in/StudentSignIn';
import { WhatsAppSignIn } from '@/features/sign-in/WhatsAppSignIn';
import type { SignInWaysProps } from './SignInWays.types';
import { useSignInWays } from './use-sign-in-ways';

/**
 * One sign-in for guardians and students, with no tabs: WhatsApp first, the student
 * code + password one plain tap away. While WhatsApp codes are off: the password form and one
 * quiet line saying why there is no WhatsApp.
 */
export function SignInWays({ codes }: SignInWaysProps) {
  const { way, byWhatsApp, switchLabel, switchWay } = useSignInWays(codes);
  return (
    <div className="grid gap-4">
      <div key={way} className="animate-fade-up">
        {byWhatsApp ? <WhatsAppSignIn /> : <StudentSignIn codes={codes} />}
      </div>
      {codes ? (
        <Button type="button" variant="ghost" className="justify-self-center" onClick={switchWay}>
          {switchLabel}
        </Button>
      ) : (
        <p className="text-center text-sm text-ink-3">{t.familyApp.signIn.whatsappOff}</p>
      )}
    </div>
  );
}
