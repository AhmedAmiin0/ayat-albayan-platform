import { useState } from 'react';
import {
  Button,
  t,
  PhoneSignIn,
  ResetFlow,
  authApi,
  CodesGate,
  useCodesOpen,
  LinkRow,
  PasswordForm,
  StatusNote,
} from '@ab/web-kit';

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
