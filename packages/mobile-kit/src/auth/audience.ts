// Two apps on the phone (docs/50 §7): the staff app (apps/mobile) and the family app
// (apps/family). Who may stay signed in, and the «wrongApp» notice, follow the app's audience,
// which each app's entry (index.ts) names once, before its first screen.

export type Audience = 'staff' | 'family';

let current: Audience = 'staff';

/** The app's entry names its audience; the staff app keeps the default. */
export function setAudience(next: Audience): void {
  current = next;
}

/** Which app this run is. */
export const audience = (): Audience => current;
