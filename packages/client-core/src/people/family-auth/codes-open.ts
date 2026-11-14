import type { CodeStatus } from '@ab/shared';

// Which WhatsApp codes can go out now (GET /auth/code/status, docs/30 §4, docs/46 A1), read the
// same way by the web sign-in tabs and both mobile apps (docs/50 §6).

/** family = `available` (the family flag too); staff = `staff` (teacher codes, staff reset). */
export type CodesSide = 'family' | 'staff';

const OPEN: Record<CodesSide, (status: CodeStatus) => boolean> = {
  family: (status) => status.available,
  staff: (status) => status.staff,
};

/** Can this side's codes be sent now? No status (a failed call) reads as «not available». */
export function codesOpen(status: CodeStatus | undefined, side: CodesSide): boolean {
  return status ? OPEN[side](status) : false;
}

/** The query key of GET /auth/code/status, shared so every screen reads one cached answer. */
export const CODE_STATUS_KEY = ['auth', 'code-status'] as const;

/** How long a code status stays fresh: the admins flip the switch rarely. */
export const CODE_STATUS_STALE_MS = 60_000;
