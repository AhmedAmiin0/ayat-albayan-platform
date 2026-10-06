import { useState } from 'react';
import { Linking, View } from 'react-native';
import { t } from '@/lib/i18n';
import { Button } from '@/ui/Button';
import { ErrorLine } from '@/inbox/ErrorLine';
import { safeLink } from './applicant-params';

interface Props {
  cv: string | null | undefined;
  recitation: string | null | undefined;
}

/** «فتح السيرة الذاتية» / «فتح تسجيل التلاوة»: the stored links, opened outside the app. Nothing if neither exists. */
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
    <View style={{ gap: 2 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
        {cvUrl ? <Button variant="ghost" label={t.mobileLeads.openCv} onPress={() => open(cvUrl)} /> : null}
        {recitationUrl ? <Button variant="ghost" label={t.mobileLeads.openRecitation} onPress={() => open(recitationUrl)} /> : null}
      </View>
      {failed ? <ErrorLine message={t.mobileLeads.linkFailed} /> : null}
    </View>
  );
}
