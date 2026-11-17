import type { ChannelSenderLabel } from '@ab/shared';
import type { Palette } from '../../theme';

/**
 * A sender's name colour (the ChatX boards): the teacher in the brand green, the follow-up owner
 * in the action amber, the family and anyone else in ink-2. Tokens, so dark mode follows.
 */
export const ROLE_INK: Readonly<Record<ChannelSenderLabel, keyof Palette>> = {
  teacher: 'lapis',
  sales: 'act',
  guardian: 'ink2',
  student: 'ink2',
  unknown: 'ink2',
};
