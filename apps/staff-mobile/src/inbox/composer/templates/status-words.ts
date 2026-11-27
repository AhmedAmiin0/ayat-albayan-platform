import { templateStatusStyle, type TemplateView } from '@ab/shared';
import type { TemplateStatus } from '@ab/catalog';
import type { Glyph, Tone } from '@ab/money';
import { t } from '@ab/mobile-kit';

// Anything other than pending, approved or rejected shows as unavailable.

type Shown = 'pending' | 'approved' | 'rejected' | 'other';

const SHOWN: Partial<Record<TemplateStatus, Shown>> = {
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
};

interface StatusWord {
  tone: Tone;
  glyph: Glyph;
  label: string;
}

const OTHER = { tone: 'neutral', glyph: 'hollow' } as const;

export function statusWord(status: TemplateStatus): StatusWord {
  const shown = SHOWN[status] ?? 'other';
  const style = shown === 'other' ? OTHER : templateStatusStyle[status];
  return { ...style, label: t.templates.author.status[shown] };
}

/** Meta's rejection reason, only under a rejected template. */
export const rejectionOf = (tpl: TemplateView): string | null =>
  tpl.status === 'rejected' && tpl.last_error ? tpl.last_error : null;
