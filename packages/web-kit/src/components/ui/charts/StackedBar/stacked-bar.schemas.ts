import { z } from 'zod';

export const SHARE_FLAGS = ['act', 'bad'] as const;
export const shareFlagSchema = z.enum(SHARE_FLAGS);
export type ShareFlag = z.infer<typeof shareFlagSchema>;
