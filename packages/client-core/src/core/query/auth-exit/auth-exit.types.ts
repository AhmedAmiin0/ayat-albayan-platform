export interface AuthExitDeps {
  /** Ends the session; the app's auth gate then shows its sign-in page. */
  signOut: () => Promise<unknown>;
  /** Leaves the reason for the sign-in page before a disabled account is signed out. */
  onDisabled?: () => void;
}

/** A query or mutation cache onError: signs out on a 401 or a disabled account. */
export type AuthExit = (error: unknown) => void;
