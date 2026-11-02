import type { MeetingInviteResult } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/core/ui/feedback/Note';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { InviteResultRow } from './InviteResultRow';

const R = t.meetingInvites.results;

/** «نتيجة الدعوات» after a create: one row per recipient; the personal links show only this once. */
export function InviteResults({ results }: { results: readonly MeetingInviteResult[] }) {
  const { color } = useTheme();
  if (results.length === 0) return null;
  return (
    <View accessibilityLiveRegion="polite" style={{ gap: 4 }}>
      <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.body, color: color.ink }}>{R.title}</AppText>
      {results.some((r) => r.link) ? <Note>{R.linkOnce}</Note> : null}
      {results.map((r) => (
        <InviteResultRow key={r.id} result={r} />
      ))}
    </View>
  );
}
