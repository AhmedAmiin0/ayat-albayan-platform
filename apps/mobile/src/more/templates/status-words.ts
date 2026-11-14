import type { AuthorTemplate } from '@ab/client-core';
import { templateStatusStyle, type Glyph, type TemplateStatus, type Tone } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';

// The author's status chip (owner 2026-11-14): «قيد المراجعة / معتمد / مرفوض», anything else
// «غير متاح» (never sent, paused, disabled, missing).

type Shown = 'pending' | 'approved' | 'rejected' | 'other';

const SHOWN: Partial<Record<TemplateStatus, Shown>> = {
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
};

export interface StatusWord {
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
export const rejectionOf = (tpl: AuthorTemplate): string | null =>
  tpl.status === 'rejected' && tpl.last_error ? tpl.last_error : null;
