import type { TemplateStatus } from '@ab/catalog';
import type { Glyph, Tone } from '@ab/money';

// Any status other than pending, approved or rejected reads as unavailable.

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
