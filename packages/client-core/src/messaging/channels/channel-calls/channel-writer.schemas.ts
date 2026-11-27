import { z } from 'zod';
import type { ChannelAudience } from '../channels';

/** The audiences with write routes; the monitor reads only (docs/31 §2). */
const CHANNEL_WRITERS = ['teacher', 'portal', 'sales'] as const;
export const channelWriterSchema = z.enum(CHANNEL_WRITERS);
export type ChannelWriter = z.infer<typeof channelWriterSchema>;

/** A writer's route table key; the monitor's screens never write (mode 'read'), so it throws. */
export const channelWriterOf = (audience: ChannelAudience): ChannelWriter =>
  channelWriterSchema.parse(audience);
