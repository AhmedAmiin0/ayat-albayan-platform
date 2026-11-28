import { channelTimeText } from '@ab/client-core';
import type { ChannelReads } from '@ab/shared';
import { useClockCycle } from '../../../lib/clock/clock-store';
import { phoneTz } from '../../../lib/clock/phone-tz';
import { t } from '../../../lib/i18n/i18n';
import { locale } from '../../../lib/i18n/locale';
import { useNow } from '../../../lib/time/use-now';
import { useMessageReads } from '../use-message-reads';
import type { ReadsSheetProps, Person } from './ReadsSheet.types';

const NOBODY: ChannelReads = { read: [], unread: [] };
export function useReadsSheet({ refs, messageId }: Pick<ReadsSheetProps, 'refs' | 'messageId'>) {
  const reads = useMessageReads(refs, messageId);
  const clock = { tz: phoneTz(), now: useNow(), locale, cycle: useClockCycle() };
  const rowOf = (p: Person) => ({
    key: `${p.name}-${p.at ?? ''}`,
    line: [p.name, t.studentChannel.roles[p.role]].filter(Boolean).join(' · '),
    time: p.at ? channelTimeText({ iso: p.at, ...clock }) : '',
  });
  const data = reads.data ?? NOBODY;
  const r = t.studentChannel.reads;
  return { reads, rowOf, data, r };
}
