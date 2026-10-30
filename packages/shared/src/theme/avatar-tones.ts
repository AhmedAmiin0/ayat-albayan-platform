import type { ThemeName } from './theme.js';

// The initials circle's backgrounds (owner 2026-10-28: one consistent circle when there is no photo).
// Six muted tones, the text is always `ink` (AA in both themes: avatar-tones.test.ts). A person keeps
// the same tone on every screen and both apps: avatarTone(id) hashes the person's id, never the name.
// apps/web/src/styles/avatar-tones.css carries the same hex (its test diffs the two).
export const avatarTones: Record<ThemeName, readonly string[]> = {
  light: ['#d9efe3', '#f3e6c4', '#dbe9f6', '#f4dfe3', '#e6e0f3', '#d6eeee'],
  dark: ['#2d4a3b', '#4a4026', '#2b4157', '#523239', '#3f3858', '#234a4a'],
};

/** 0…5: FNV-1a over the id's UTF-16 units, so the same person gets the same tone everywhere. */
export function avatarTone(id: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash % avatarTones.light.length;
}
