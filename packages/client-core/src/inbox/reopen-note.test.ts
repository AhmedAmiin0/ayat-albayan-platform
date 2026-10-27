import { describe, expect, it } from 'vitest';
import { reopenNoteKey } from './reopen-note.js';

describe('reopenNoteKey', () => {
  it('says what went: queued, already today, template not available yet', () => {
    expect(reopenNoteKey('template_queued')).toBe('requested');
    expect(reopenNoteKey('already_requested_today')).toBe('requestedToday');
    expect(reopenNoteKey('template_unavailable')).toBe('unavailable');
  });

  it('nothing sent, or the request failed: never silent', () => {
    expect(reopenNoteKey('not_sent')).toBe('failed');
    expect(reopenNoteKey('failed')).toBe('failed');
  });

  it('a restricted role, an open window, nothing asked yet: no note', () => {
    expect(reopenNoteKey('not_allowed')).toBeNull();
    expect(reopenNoteKey('window_open')).toBeNull();
    expect(reopenNoteKey(null)).toBeNull();
  });
});
