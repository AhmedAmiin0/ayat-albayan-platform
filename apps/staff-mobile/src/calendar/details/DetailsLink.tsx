import { safeHttpUrl } from '@ab/shared';
import { useState } from 'react';
import { Linking, View } from 'react-native';
import { copyOrShare } from '@/core/lib/clipboard';
import { t, type, useTheme, AppText, Button } from '@ab/mobile-kit';
import { ButtonRow, copyIcon, openIcon } from '@/core/ui/actions';
import { DetailsFact, DetailsLine } from './DetailsGroup';

type LinkNote = 'copied' | 'failed' | null;

/** In our classroom family links are per-family secrets, so only the full external URL is shown. */
export function DetailsLink({ link, platform }: { link: string | null; platform: boolean }) {
  const { color } = useTheme();
  const [note, setNote] = useState<LinkNote>(null);
  const url = platform ? null : safeHttpUrl(link);
  const copy = async (text: string) => {
    setNote(null);
    const result = await copyOrShare(text);
    setNote(result === 'shared' ? null : result);
  };
  const open = (text: string) => {
    setNote(null);
    Linking.openURL(text).catch(() => setNote('failed'));
  };
  const small = { fontFamily: type.ui[500], fontSize: type.size.xs, color: color.ink2 };
  const head = { fontFamily: type.ui[500], fontSize: type.size.xs, lineHeight: type.lineHeight(type.size.xs), color: color.ink3 };
  if (!url) {
    return (
      <DetailsFact label={t.lessons.joinLink}>
        <DetailsLine>{platform ? t.lessons.viaClassroom : t.lessons.noLink}</DetailsLine>
      </DetailsFact>
    );
  }
  return (
    <View style={{ gap: 6 }}>
      <AppText style={head}>{t.lessons.joinLink}</AppText>
      {/* No Ltr isolates (LRI/PDI): a long-press copy would paste them; a URL starts with Latin letters, so it reads LTR. */}
      <AppText selectable numberOfLines={1} ellipsizeMode="middle" style={{ ...small, writingDirection: 'ltr', textAlign: 'left' }}>
        {url}
      </AppText>
      <ButtonRow>
        <Button variant="secondary" icon={copyIcon} label={t.lessons.copyLink} onPress={() => void copy(url)} />
        <Button variant="secondary" icon={openIcon} label={t.studentLists.openLink} onPress={() => open(url)} />
      </ButtonRow>
      {note ? (
        <AppText accessibilityLiveRegion="polite" style={small}>
          {note === 'copied' ? t.lessons.linkCopied : t.studentLists.shareFailed}
        </AppText>
      ) : null}
    </View>
  );
}
