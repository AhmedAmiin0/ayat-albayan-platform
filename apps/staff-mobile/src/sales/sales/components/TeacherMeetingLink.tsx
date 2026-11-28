import { safeHttpUrl } from '@ab/shared';
import { useState } from 'react';
import { Linking, Share, View } from 'react-native';
import { copyOrShare } from '@/core/lib/clipboard';
import { t, type, useTheme, AppText, Button } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { ButtonRow, copyIcon, openIcon } from '@/core/ui/actions';
import { SmallHeading } from './SmallHeading';

const L = t.studentLists;

/** Only an http(s) URL is shown; a platform-classroom teacher's families get the platform link. */
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
            style={{
              writingDirection: 'ltr',
              textAlign: 'left',
              fontFamily: type.ui[500],
              fontSize: type.size.sm,
              color: color.ink,
            }}
          >
            {url}
          </AppText>
          <ButtonRow>
            <Button
              variant="secondary"
              icon={copyIcon}
              label={L.copyLink}
              onPress={() => void copy(url)}
            />
            <Button variant="secondary" label={L.shareLink} onPress={() => share(url)} />
            <Button
              variant="secondary"
              icon={openIcon}
              label={L.openLink}
              onPress={() => void Linking.openURL(url).catch(() => setFailed(true))}
            />
          </ButtonRow>
          {copied ? (
            <AppText
              accessibilityLiveRegion="polite"
              style={{ fontFamily: type.ui[500], fontSize: type.size.xs, color: color.ink2 }}
            >
              {L.copied}
            </AppText>
          ) : null}
          {failed ? (
            <AppText
              accessibilityRole="alert"
              style={{ fontFamily: type.ui[500], fontSize: type.size.xs, color: color.ink2 }}
            >
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
