import { useState } from 'react';
import {
  t,
  authApi,
  CodesGate,
  LinkRow,
  PasswordForm,
  StatusNote,
  ResetFlow,
  PhoneSignIn,
} from '@ab/web-kit';

const F = t.familyAuth;
type View = 'phone' | 'username' | 'forgot' | 'firstTime';

/** Hidden entirely while WhatsApp codes are off (docs/30 §4). */
export function FamilyPanel() {
  return (
    <CodesGate fallback={<StatusNote>{F.familyUnavailable}</StatusNote>}>
      <FamilyViews />
    </CodesGate>
  );
}

function FamilyViews() {
  const [view, setView] = useState<View>('phone');
  const [saved, setSaved] = useState(false);
  const go = (to: View) => () => setView(to);
  const firstTime = { label: F.firstTime, onClick: go('firstTime') };

  if (view === 'forgot' || view === 'firstTime') {
    const done = (ok: boolean) => {
      setSaved(ok);
      setView(ok ? 'username' : 'phone');
    };
    // A key per mode so switching between reset modes starts empty.
    return <ResetFlow key={view} mode={view} onDone={done} />;
  }
  return (
    <>
      {view === 'phone' && <p className="text-body text-pretty text-ink-2">{F.familyIntro}</p>}
      {saved && <StatusNote>{F.passwordSaved}</StatusNote>}
      {view === 'phone' ? (
        <PhoneSignIn codes={authApi.familyCodes}>
          <LinkRow links={[{ label: F.withUsername, onClick: go('username') }, firstTime]} />
        </PhoneSignIn>
      ) : (
        <PasswordForm id="username" label={F.username} hint={F.studentUsernameHint}>
          <LinkRow
            links={[
              { label: F.withPhone, onClick: go('phone') },
              { label: F.forgot, onClick: go('forgot') },
              firstTime,
            ]}
          />
        </PasswordForm>
      )}
    </>
  );
}
