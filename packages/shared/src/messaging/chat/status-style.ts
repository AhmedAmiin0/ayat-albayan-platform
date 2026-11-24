import type { MessageStatus, TemplateStatus } from '@ab/catalog';
import type { StatusStyle } from '@ab/money';

// Status chips follow docs/07 §6; labels from ar.json enums.messageStatus and enums.templateStatus.

/** A failed send is the admin's to retry or send by hand (R-MSG-03/05). */
export const messageStatusStyle: Record<MessageStatus, StatusStyle> = {
  queued: { tone: 'neutral', glyph: 'hollow' },
  sent: { tone: 'neutral', glyph: 'half' },
  delivered: { tone: 'ok', glyph: 'half' },
  read: { tone: 'ok', glyph: 'fill' },
  failed: { tone: 'act', glyph: 'struck' },
  sent_manually: { tone: 'ok', glyph: 'fill' },
};

/** Not submitted / rejected / missing need the admin; pending waits on Meta. */
export const templateStatusStyle: Record<TemplateStatus, StatusStyle> = {
  not_submitted: { tone: 'act', glyph: 'hollow' },
  pending: { tone: 'neutral', glyph: 'half' },
  approved: { tone: 'ok', glyph: 'fill' },
  rejected: { tone: 'act', glyph: 'struck' },
  paused: { tone: 'bad', glyph: 'half' },
  disabled: { tone: 'bad', glyph: 'struck' },
  missing: { tone: 'act', glyph: 'struck' },
};
