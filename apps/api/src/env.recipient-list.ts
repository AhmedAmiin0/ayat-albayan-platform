import { parseAllowedRecipients } from '@ab/shared';
import { z } from 'zod';

/** WA_ALLOWED_RECIPIENTS in the env schema: comma list → normalised E.164 list; any bad item fails the boot, naming it (fail closed). */
export const recipientList = z.string().transform((raw, ctx) => {
  const { items, bad } = parseAllowedRecipients(raw);
  if (bad === null) return items;
  ctx.addIssue({ code: 'custom', message: `WA_ALLOWED_RECIPIENTS: not an E.164 number: ${bad}` });
  return z.NEVER;
});
