import { z } from 'zod';

const ROUND_TONES = ['plain', 'accept', 'end'] as const;
export const roundToneSchema = z.enum(ROUND_TONES);
export type RoundTone = z.infer<typeof roundToneSchema>;
