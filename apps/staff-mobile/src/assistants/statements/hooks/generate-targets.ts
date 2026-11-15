/**
 * Who «احسب كشوف الشهر» builds (web generate-targets): the chosen salesperson, else all of them,
 * minus anyone whose statement for the month is already approved or paid (the API would refuse it).
 */
export function generateTargets(
  assistantIds: readonly string[],
  statements: readonly { assistant: { id: string }; status: 'draft' | 'approved' | 'paid' }[],
): string[] {
  const frozen = new Set(statements.filter((s) => s.status !== 'draft').map((s) => s.assistant.id));
  return assistantIds.filter((id) => !frozen.has(id));
}
