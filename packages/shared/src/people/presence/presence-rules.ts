import type { UserRole } from '../../catalog/permissions/index.js';

// Who may see whose online status and last seen (docs/33 §2, owner 2026-10-30). The API applies it
// to every presence answer; migration 985's presence_can_watch is its twin at the Realtime socket.

const FAMILY: readonly UserRole[] = ['guardian', 'student'];

export interface PresencePair {
  viewer: UserRole | null;
  target: UserRole | null;
  /**
   * The viewer can already open a chat with the target: a participant or monitor of the target's
   * student channel (the channel's own access check passed), or the admin's staff list.
   */
  linked: boolean;
}

/**
 * Never the presence of someone the viewer cannot open a chat with. The admin sees everyone; a
 * teacher and an assistant (sales) only the family app users of their chats; a family only its
 * teacher(s).
 */
export function maySeePresence({ viewer, target, linked }: PresencePair): boolean {
  if (viewer === null || target === null) return false;
  if (viewer === 'admin') return true;
  if (!linked) return false;
  if (viewer === 'teacher' || viewer === 'sales') return FAMILY.includes(target);
  if (FAMILY.includes(viewer)) return target === 'teacher';
  return false;
}
