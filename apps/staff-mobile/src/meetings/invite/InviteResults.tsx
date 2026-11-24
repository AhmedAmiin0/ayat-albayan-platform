import type { MeetingInviteResult } from '@ab/schedule';
import { View } from 'react-native';
import { t, type, useTheme, AppText } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
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
