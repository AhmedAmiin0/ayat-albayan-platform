// WhatsApp cannot delete a sent message, so staff only hide it from the platform.

/** A hidden WhatsApp message: who hid it and when (the bubble's muted placeholder). */
export interface MessageHidden {
  /** The staff member's name; null once their login is gone. */
  by_name: string | null;
  at: string;
}

/** Hidden from the platform: staff see a placeholder; absent in an old cache. */
export interface HiddenMark {
  hidden?: MessageHidden | null;
}

/** The signed-in user as the rule reads it: base role and effective permissions. */
export interface HideActor {
  role?: string | null;
  permissions?: readonly string[] | null;
}

/** Staff who reply in the inbox (admin, sales): never a teacher in teacher mode. */
export const canHideMessages = (who: HideActor | null | undefined): boolean =>
  !!who && who.role !== 'teacher' && (who.permissions ?? []).includes('inbox.send');

/** Unhiding is the admin's only. */
export const canUnhideMessages = (who: HideActor | null | undefined): boolean =>
  who?.role === 'admin';
