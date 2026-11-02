import { safeHttpUrl } from '@ab/shared';
import { useState } from 'react';
import { Linking, Share, View } from 'react-native';
import { copyOrShare } from '@/core/lib/clipboard';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/core/ui/feedback/Note';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { ButtonRow, copyIcon, openIcon } from '@/core/ui/actions';
import { Button } from '@/core/ui/primitives/Button';
import { SmallHeading } from './SmallHeading';

const L = t.studentLists;

/**
 * «رابط الحلقة الثابت» on the sales teacher's page (owner 2026-10-12: the one place sales sees a
 * meeting link besides the schedule's lesson link, web parity): the URL as selectable LTR text,
 * «انسخ الرابط» (core/lib/clipboard: React Native core's clipboard, the share sheet when it fails),
 * «شارك الرابط» (the phone's share sheet) and «افتح الرابط». Only an http(s)
 * URL is shown, anything else reads «لا يوجد رابط ثابت». When the teacher holds her lessons in our
 * classroom (SalesTeacherView.platform_classroom, per-teacher meeting mode) a line says families get
 * the platform link instead.
 */
export function TeacherMeetingLink({ link, platform }: { link: string | null; platform: boolean }) {
  const { color } = useTheme();
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const url = safeHttpUrl(link);
  const share = (text: string) => {
    setFailed(false);
    setCopied(false);
    Share.share({ message: text }).catch(() => setFailed(true));
  };
  const copy = async (text: string) => {
    setFailed(false);
    const result = await copyOrShare(text);
    setCopied(result === 'copied');
    setFailed(result === 'failed');
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
          <ButtonRow>
            <Button variant="secondary" icon={copyIcon} label={L.copyLink} onPress={() => void copy(url)} />
            <Button variant="secondary" label={L.shareLink} onPress={() => share(url)} />
            <Button variant="secondary" icon={openIcon} label={L.openLink} onPress={() => void Linking.openURL(url).catch(() => setFailed(true))} />
          </ButtonRow>
          {copied ? (
            <AppText accessibilityLiveRegion="polite" style={{ fontFamily: type.ui[500], fontSize: type.size.xs, color: color.ink2 }}>
              {L.copied}
            </AppText>
          ) : null}
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
