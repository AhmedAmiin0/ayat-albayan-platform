import type { MessageStatus, TemplateStatus } from '../../enums/index.js';
import type { StatusStyle } from '../../money/status-style/status-style.js';

// Phase 4 status chips (docs/07 §6 grammar: act = the admin must do something, «دورك»).
// Labels: ar.json enums.messageStatus / enums.templateStatus.

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
