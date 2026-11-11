import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';
import { PhoneSignIn } from '@/features/people/auth/family/PhoneSignIn';
import { ResetFlow } from '@/features/people/auth/reset/ResetFlow';
import { authApi } from './auth-api';
import { CodesGate, useCodesOpen } from './CodesGate';
import { LinkRow } from './LinkRow';
import { PasswordForm } from './PasswordForm';
import { StatusNote } from './StatusNote';

type View = 'password' | 'code' | 'forgot';

/**
 * «فريق الأكاديمية» (the default tab): email, username or phone + password, «نسيت كلمة المرور؟»,
 * and «الدخول برمز واتساب» for teachers while staff codes can be sent (docs/46 A6). While they are
 * off the reset is the admin's (docs/30 §4).
 */
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
