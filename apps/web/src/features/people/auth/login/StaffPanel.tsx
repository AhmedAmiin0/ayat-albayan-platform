import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';
import { ResetFlow } from '../reset/ResetFlow';
import { CodesGate } from './CodesGate';
import { LinkRow } from './LinkRow';
import { PasswordForm } from './PasswordForm';
import { StatusNote } from './StatusNote';

/**
 * «فريق الأكاديمية» (the default tab): email or username + password, and «نسيت كلمة المرور؟». While
 * WhatsApp codes are off the reset is the admin's (docs/30 §4).
 */
export function StaffPanel() {
  const [forgot, setForgot] = useState(false);
  const [saved, setSaved] = useState(false);
  const done = (ok: boolean) => {
    setSaved(ok);
    setForgot(false);
  };

  if (forgot) {
    const byAdmin = (
      <div className="grid gap-[22px]">
        <StatusNote>{t.familyAuth.staffResetByAdmin}</StatusNote>
        <Button type="button" variant="secondary" onClick={() => done(false)}>
          {t.familyAuth.backToLogin}
        </Button>
      </div>
    );
    return (
      <CodesGate fallback={byAdmin}>
        <ResetFlow mode="forgot" onDone={done} />
      </CodesGate>
    );
  }
  return (
    <>
      <p className="text-body text-pretty text-ink-2">{t.auth.intro}</p>
      {saved && <StatusNote>{t.familyAuth.passwordSaved}</StatusNote>}
      <PasswordForm id="email" label={t.auth.email}>
        <LinkRow links={[{ label: t.familyAuth.forgot, onClick: () => setForgot(true) }]} />
      </PasswordForm>
    </>
  );
}
