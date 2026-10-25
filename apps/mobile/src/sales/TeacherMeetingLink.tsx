import { safeHttpUrl } from '@ab/shared';
import { useState } from 'react';
import { Linking, Share, View } from 'react-native';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { SmallHeading } from './SmallHeading';

const L = t.studentLists;

/**
 * «رابط الحلقة الثابت» on the sales teacher's page (owner 2026-10-12: the one place sales sees a
 * meeting link, web parity): the URL as selectable LTR text (long-press to copy), «شارك الرابط» (the
 * phone's share sheet: no clipboard module, the app ships by OTA) and «افتح الرابط». Only an http(s)
 * URL is shown, anything else reads «لا يوجد رابط ثابت». When the teacher holds her lessons in our
 * classroom (SalesTeacherView.platform_classroom, per-teacher meeting mode) a line says families get
 * the platform link instead.
 */
export function TeacherMeetingLink({ link, platform }: { link: string | null; platform: boolean }) {
  const { color } = useTheme();
  const [failed, setFailed] = useState(false);
  const url = safeHttpUrl(link);
  const share = (text: string) => {
    setFailed(false);
    Share.share({ message: text }).catch(() => setFailed(true));
  };
  return (
    <View accessibilityLabel={L.meetingLink} style={{ gap: 6, alignSelf: 'stretch' }}>
      <SmallHeading>{L.meetingLink}</SmallHeading>
      {url ? (
        <>
          {/* No Ltr isolates (LRI/PDI) here: a long-press copy would paste them; a URL starts with Latin letters, so it reads LTR. */}
          <AppText
            selectable
            numberOfLines={2}
            style={{ writingDirection: 'ltr', textAlign: 'left', fontFamily: type.ui[500], fontSize: type.size.sm, color: color.ink }}
          >
            {url}
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Button variant="secondary" label={L.shareLink} onPress={() => share(url)} />
            <Button variant="secondary" label={L.openLink} onPress={() => void Linking.openURL(url).catch(() => setFailed(true))} />
          </View>
          {failed ? (
            <AppText accessibilityRole="alert" style={{ fontFamily: type.ui[500], fontSize: type.size.xs, color: color.ink2 }}>
              {L.shareFailed}
            </AppText>
          ) : null}
        </>
      ) : (
        <Note>{L.meetingLinkNone}</Note>
      )}
      {platform ? <Note>{L.meetingLinkAuto}</Note> : null}
    </View>
  );
}
