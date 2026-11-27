import { Ltr, t } from '@ab/web-kit';
import { PersonHead } from '@/features/account/PersonHead';
import type { WhoProps } from '@/features/account/Who/Who.types';

/** A guardian: their name and WhatsApp number (E.164, an LTR island); an older API: the role. */
export function GuardianHead({ home }: WhoProps) {
  const guardian = home.guardian;
  if (!guardian) return <PersonHead name={t.portal.app.account.guardian} />;
  return (
    <PersonHead
      name={guardian.name}
      role={t.portal.app.account.roleGuardian}
      detail={<Ltr>{guardian.phone}</Ltr>}
    />
  );
}
