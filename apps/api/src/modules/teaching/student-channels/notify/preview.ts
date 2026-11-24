import { channelMessageKindOf, sliceCodePoints } from '@ab/shared';
import { ar } from '@/common/infra/i18n/server-text';
import type { ChannelMessageRow } from '@/modules/teaching/student-channels/channel.repo';

/** The push and bell row quote this much of the message. */
const PREVIEW = 80;

/** A message in a push or bell row: its text, else what it carries. */
export function previewOf(row: Pick<ChannelMessageRow, 'body' | 'kind'>): string {
  const text = sliceCodePoints(row.body, PREVIEW);
  return text === '' ? ar.studentChannel.kinds[channelMessageKindOf(row.kind)] : text;
}
