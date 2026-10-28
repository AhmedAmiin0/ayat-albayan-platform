import { useState } from 'react';
import { Linking, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { ButtonRow, openIcon } from '@/core/ui/actions';
import { Button } from '@/core/ui/primitives/Button';
import { ErrorLine } from '@/inbox/ErrorLine';
import { safeLink } from './applicant-params';

interface Props {
  cv: string | null | undefined;
  recitation: string | null | undefined;
}

/**
 * «فتح السيرة الذاتية» | «فتح تسجيل التلاوة» (one ButtonRow, outlined with the open icon: docs/07 §6): the
 * stored links, opened outside the app. Nothing if neither exists.
 */
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
