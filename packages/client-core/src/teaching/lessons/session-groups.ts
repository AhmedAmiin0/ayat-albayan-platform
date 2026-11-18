// The admin classroom board (web /admin/classrooms, mobile AdminSessionsScreen): a lesson's room is
// open now, still to open, or closed.

/** The three groups of the board, in reading order. */
export const SESSION_GROUPS = ['now', 'upcoming', 'ended'] as const;
export type SessionGroup = (typeof SESSION_GROUPS)[number];
