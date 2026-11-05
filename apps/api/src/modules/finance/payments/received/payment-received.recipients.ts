/** Who hears of an incoming payment (owner 2026-11-05). */
interface RecipientsInput {
  /** Every enabled admin. */
  admins: readonly string[];
  /** The student's following assistant(s); none → the admins only. */
  owners: readonly string[];
  /** Who recorded the payment by hand: they know already. null = nobody (a Stripe payment). */
  recorderId: string | null;
}

/**
 * The admins plus the student's assistant(s), once each, minus whoever recorded the payment. Pure;
 * a disabled or unpermitted profile is dropped later by PushAudience.
 */
export function receivedRecipients(input: RecipientsInput): string[] {
  const all = new Set([...input.admins, ...input.owners]);
  return [...all].filter((id) => id !== input.recorderId);
}
