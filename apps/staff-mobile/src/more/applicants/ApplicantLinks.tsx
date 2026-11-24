import { useState } from 'react';
import { Linking, View } from 'react-native';
import { t, Button, ErrorLine } from '@ab/mobile-kit';
import { ButtonRow, openIcon } from '@/core/ui/actions';
import { safeLink } from './applicant-params';

interface Props {
  cv: string | null | undefined;
  recitation: string | null | undefined;
}

/** docs/07 §6: one ButtonRow; links open outside the app; nothing if neither exists. */
export function ApplicantLinks({ cv, recitation }: Props) {
  const [failed, setFailed] = useState(false);
  const open = (url: string) => {
    setFailed(false);
    Linking.openURL(url).catch(() => setFailed(true));
  };
  const cvUrl = safeLink(cv);
  const recitationUrl = safeLink(recitation);
  if (!cvUrl && !recitationUrl) return null;
  return (
    <View style={{ gap: 8 }}>
      <ButtonRow>
        {cvUrl ? <Button variant="secondary" icon={openIcon} label={t.mobileLeads.openCv} onPress={() => open(cvUrl)} /> : null}
        {recitationUrl ? (
          <Button variant="secondary" icon={openIcon} label={t.mobileLeads.openRecitation} onPress={() => open(recitationUrl)} />
        ) : null}
      </ButtonRow>
      {failed ? <ErrorLine message={t.mobileLeads.linkFailed} /> : null}
    </View>
  );
}
