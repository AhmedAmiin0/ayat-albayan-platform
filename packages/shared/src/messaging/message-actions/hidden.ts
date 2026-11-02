// «حذف من المنصة» (owner 2026-10-30): WhatsApp's API cannot edit or delete a sent message, so staff
// may only hide one from the platform. It stays on the customer's phone; nothing goes to WhatsApp.

/** A hidden WhatsApp message: who hid it and when (the bubble's muted placeholder). */
export interface MessageHidden {
  /** The staff member's name; null once their login is gone. */
  by_name: string | null;
  at: string;
}

/**
 * On a MessageView: «حذف من المنصة» — staff see a placeholder (no text or file). Absent in an old
 * cache.
 */
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

/** «إظهار»: the admin only. */
export const canUnhideMessages = (who: HideActor | null | undefined): boolean =>
  who?.role === 'admin';
