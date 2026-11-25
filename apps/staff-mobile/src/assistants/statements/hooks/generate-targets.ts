/** Skips anyone whose month is already approved or paid, which the API would refuse. */
export function generateTargets(
  assistantIds: readonly string[],
  statements: readonly { assistant: { id: string }; status: 'draft' | 'approved' | 'paid' }[],
): string[] {
  const frozen = new Set(statements.filter((s) => s.status !== 'draft').map((s) => s.assistant.id));
  return assistantIds.filter((id) => !frozen.has(id));
}
