import type { PortalHome, PortalKind } from '@ab/shared';
import type { ReactElement } from 'react';
import { Ltr, t } from '@ab/web-kit';
import { PersonHead } from '@/features/account/PersonHead';

const A = t.portal.app.account;

/** A guardian: their name and WhatsApp number (E.164, an LTR island); an older API: the role. */
function GuardianHead({ home }: { home: PortalHome }) {
  const guardian = home.guardian;
  if (!guardian) return <PersonHead name={A.guardian} />;
  return (
    <PersonHead
      name={guardian.name}
      role={A.roleGuardian}
      detail={<Ltr>{guardian.phone}</Ltr>}
    />
  );
}

function StudentHead({ home }: { home: PortalHome }) {
  const own = home.students[0];
  if (!own) return <PersonHead name={A.roleStudent} />;
  const [before = '', after = ''] = A.code.split('{code}');
  return (
    <PersonHead
      name={own.name}
      role={A.roleStudent}
      detail={<>{before}<Ltr>{own.code}</Ltr>{after}</>}
    />
  );
}

const HEADS: Readonly<Record<PortalKind, (props: { home: PortalHome }) => ReactElement>> = {
  guardian: GuardianHead,
  student: StudentHead,
};

/** Who signed in, by the login's kind. */
export function Who({ home }: { home: PortalHome }) {
  const Head = HEADS[home.kind];
  return <Head home={home} />;
}
