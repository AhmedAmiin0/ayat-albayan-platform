import type { Glyph, TemplateStatus, Tone } from '@ab/shared';

// «قيد المراجعة / معتمد / مرفوض» (owner 2026-11-14): what an author needs of Meta's status; any
// other (never sent, missing, paused, disabled) reads «غير متاح».

export type AuthorStatus = 'pending' | 'approved' | 'rejected' | 'other';

const SHOWN: Partial<Record<TemplateStatus, AuthorStatus>> = {
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
};

export const authorStatus = (status: TemplateStatus): AuthorStatus => SHOWN[status] ?? 'other';

export const AUTHOR_STATUS_STYLE: Record<AuthorStatus, { tone: Tone; glyph: Glyph }> = {
  pending: { tone: 'neutral', glyph: 'half' },
  approved: { tone: 'ok', glyph: 'fill' },
  rejected: { tone: 'bad', glyph: 'struck' },
  other: { tone: 'act', glyph: 'hollow' },
};
