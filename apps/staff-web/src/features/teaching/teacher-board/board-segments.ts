import type { StudentListKind } from '@ab/shared';
import { t } from '@ab/web-kit';

// Board segments (docs/46 D4, docs/48); docs/47 PR2 adds a paused segment here.

export type BoardSegment = StudentListKind;

/** Reading order; all is the default. */
export const BOARD_SEGMENTS: readonly BoardSegment[] = ['active', 'trial', 'all'];
export const DEFAULT_SEGMENT: BoardSegment = 'all';

const L = t.studentLists;

export const SEGMENT_LABEL: Record<BoardSegment, string> = {
  active: L.active,
  trial: L.trial,
  all: L.all,
};

/** The title of an empty segment; the hint under it is one sentence for every segment. */
export const EMPTY_TITLE: Record<BoardSegment, string> = {
  active: L.emptyActive,
  trial: L.emptyTrial,
  all: t.teacherBoard.noStudents,
};
