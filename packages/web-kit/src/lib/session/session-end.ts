const forgetters = new Set<() => void>();

/**
 * What an app keeps per browser tab for the signed-in person (the staff inbox's unsent replies and
 * half-typed registrations): registered once at boot, forgotten whenever the session ends, so a
 * shared PC's next user finds none of it. The kit knows no app's memories, only this hook.
 */
export function onSessionEnd(forget: () => void): void {
  forgetters.add(forget);
}

/** Every registered tab memory, forgotten: sign-out, an expired session, another tab's sign-out. */
export function forgetTabMemories(): void {
  for (const forget of forgetters) forget();
}
