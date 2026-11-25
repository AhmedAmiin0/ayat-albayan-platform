import { useState } from 'react';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { PhoneSignIn } from '@ab/web-kit/auth/login/PhoneSignIn';
import { ResetFlow } from '@ab/web-kit/auth/reset/ResetFlow';
import { authApi } from '@ab/web-kit/auth/login/auth-api';
import { CodesGate, useCodesOpen } from '@ab/web-kit/auth/login/CodesGate';
import { LinkRow } from '@ab/web-kit/auth/login/LinkRow';
import { PasswordForm } from '@ab/web-kit/auth/login/PasswordForm';
import { StatusNote } from '@ab/web-kit/auth/login/StatusNote';

type View = 'password' | 'code' | 'forgot';

/** Code login only while staff codes can be sent (docs/46 A6); else admin resets (docs/30 §4). */
export function StaffPanel() {
  const [view, setView] = useState<View>('password');
  const [saved, setSaved] = useState(false);
  const codes = useCodesOpen('staff') === true;
  const done = (ok: boolean) => {
    setSaved(ok);
    setView('password');
  };

  if (view === 'forgot') {
    const byAdmin = (
      <div className="grid gap-[22px]">
        <StatusNote>{t.familyAuth.staffResetByAdmin}</StatusNote>
        <Button type="button" variant="secondary" onClick={() => done(false)}>
          {t.familyAuth.backToLogin}
        </Button>
      </div>
    );
    return (
      <CodesGate side="staff" fallback={byAdmin}>
        <ResetFlow mode="forgot" onDone={done} />
      </CodesGate>
    );
  }
  const toPassword = { label: t.teacherAuth.withPassword, onClick: () => setView('password') };
  if (view === 'code') {
    return (
      <>
        <p className="text-body text-pretty text-ink-2">{t.teacherAuth.codeIntro}</p>
        <PhoneSignIn codes={authApi.staffCodes} unavailable={t.teacherAuth.codesUnavailable}>
          <LinkRow links={[toPassword]} />
        </PhoneSignIn>
      </>
    );
  }
  const forgot = { label: t.familyAuth.forgot, onClick: () => setView('forgot') };
  const byCode = { label: t.teacherAuth.withCode, onClick: () => setView('code') };
  return (
    <>
      <p className="text-body text-pretty text-ink-2">{t.auth.intro}</p>
      {saved && <StatusNote>{t.familyAuth.passwordSaved}</StatusNote>}
      <PasswordForm id="email" label={t.auth.email}>
        <LinkRow links={codes ? [byCode, forgot] : [forgot]} />
      </PasswordForm>
    </>
  );
}
