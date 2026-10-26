import { safeHttpUrl } from '@ab/shared';
import { useState } from 'react';
import { Linking, View } from 'react-native';
import { copyOrShare } from '@/core/lib/clipboard';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { DetailsFact, DetailsLine } from './DetailsGroup';

type LinkNote = 'copied' | 'failed' | null;

/**
 * «رابط الحلقة» for every role (owner 2026-10-26: «see the meeting url and copy it»): «عبر الفصل» in
 * our classroom (the families' links are per-family secrets: «انسخ رابط الطالب» gets one), else the
 * full http(s) URL as selectable LTR text with «انسخ الرابط» (the share sheet when the clipboard
 * fails) and «افتح الرابط», else «لا يوجد رابط».
 */
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
  return (
    <DetailsFact label={t.lessons.joinLink}>
      {platform ? (
        <DetailsLine>{t.lessons.viaClassroom}</DetailsLine>
      ) : url ? (
        <View style={{ flex: 1, gap: 6 }}>
          {/* No Ltr isolates (LRI/PDI): a long-press copy would paste them; a URL starts with Latin letters, so it reads LTR. */}
          <AppText selectable numberOfLines={2} style={{ ...small, writingDirection: 'ltr', textAlign: 'left' }}>
            {url}
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Button variant="secondary" label={t.lessons.copyLink} onPress={() => void copy(url)} />
            <Button variant="secondary" label={t.studentLists.openLink} onPress={() => open(url)} />
          </View>
          {note ? (
            <AppText accessibilityLiveRegion="polite" style={small}>
              {note === 'copied' ? t.lessons.linkCopied : t.studentLists.shareFailed}
            </AppText>
          ) : null}
        </View>
      ) : (
        <DetailsLine>{t.lessons.noLink}</DetailsLine>
      )}
    </DetailsFact>
  );
}
