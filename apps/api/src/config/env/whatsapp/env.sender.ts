import { z } from 'zod';
import { blankIsUnset } from '@/config/env/env.blank';

/** The outbound sender (whatsapp/sender): its tick and the notifications lane's pool. */
export const SENDER_SHAPE = {
  /** The outbound sender's tick in ms (default 30 s); e2e sets ~1 s, production leaves it unset. */
  MESSAGE_SENDER_POLL_MS: z.preprocess(blankIsUnset, z.coerce.number().int().min(200).optional()),
  /**
   * docs/42 42-7: rows the notifications lane (a Meta / Kapso number) sends at the same time, never
   * two of one phone. Default 1 (as before); raising it needs the owner's OK (docs/42 §3: up to N
   * rows may be past their gate when OFF lands). The chat lane and Evolution numbers stay at 1.
   */
  MESSAGE_SENDER_CONCURRENCY: z.preprocess(
    blankIsUnset,
    z.coerce.number().int().min(1).max(8).default(1),
  ),
};
