import { channelTimeText } from '@ab/client-core';
import type { ChannelReads, ChannelSenderLabel } from '@ab/shared';
import { ActivityIndicator, View } from 'react-native';
import { useClockCycle } from '../../../lib/clock/clock-store';
import { phoneTz } from '../../../lib/clock/phone-tz';
import { t } from '../../../lib/i18n/i18n';
import { locale } from '../../../lib/i18n/locale';
import { useNow } from '../../../lib/time/use-now';
import { useTheme } from '../../../theme';
import { MenuSheet } from '../../../ui/feedback/MenuSheet';
import { AppText } from '../../../ui/primitives/AppText';
import { Button } from '../../../ui/primitives/Button';
import type { ChannelRef } from '../../channel-api';
import { ReadsList } from '../ReadsList';
import { useMessageReads } from '../use-message-reads';

interface ReadsSheetProps {
  refs: ChannelRef;
  /** The message whose ticks were held; null hides the sheet. */
  messageId: string | null;
  onClose: () => void;
}

interface Person {
  name: string;
  role: ChannelSenderLabel;
  at?: string;
}

const NOBODY: ChannelReads = { read: [], unread: [] };

/**
 * A long press on my ticks (owner: «a long press on the ticks shows who read it and when»): those
 * who read it with the time, then those who have not yet.
 */
export function ReadsSheet({ refs, messageId, onClose }: ReadsSheetProps) {
  const { color } = useTheme();
  const reads = useMessageReads(refs, messageId);
  const clock = { tz: phoneTz(), now: useNow(), locale, cycle: useClockCycle() };
  const rowOf = (p: Person) => ({
    key: `${p.name}-${p.at ?? ''}`,
    line: [p.name, t.studentChannel.roles[p.role]].filter(Boolean).join(' · '),
    time: p.at ? channelTimeText({ iso: p.at, ...clock }) : '',
  });
  const data = reads.data ?? NOBODY;
  const r = t.studentChannel.reads;
  return (
    <MenuSheet open={messageId !== null} label={r.title} testID="channel-reads" onClose={onClose}>
      {reads.isLoading ? (
        <ActivityIndicator accessibilityLabel={t.common.loading} color={color.lapis} />
      ) : null}
      {reads.isError ? (
        <AppText accessibilityRole="alert" style={{ color: color.bad }}>
          {r.failed}
        </AppText>
      ) : null}
      {reads.isSuccess ? (
        <View style={{ gap: 12 }}>
          <ReadsList title={r.read} rows={data.read.map(rowOf)} />
          <ReadsList title={r.unread} rows={data.unread.map(rowOf)} />
        </View>
      ) : null}
      <Button variant="secondary" label={t.common.close} onPress={onClose} />
    </MenuSheet>
  );
}
