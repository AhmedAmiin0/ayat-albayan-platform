/**
 * Who «احسب كشوف الشهر» builds: the chosen assistant, else all of them, minus anyone whose statement
 * for the month is already approved or paid (frozen: the API would answer invalid_transition).
 */
export function generateTargets(
  assistantIds: readonly string[],
  statements: readonly { assistant: { id: string }; status: 'draft' | 'approved' | 'paid' }[],
): string[] {
  const frozen = new Set(statements.filter((s) => s.status !== 'draft').map((s) => s.assistant.id));
  return assistantIds.filter((id) => !frozen.has(id));
}
