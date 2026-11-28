import { describe, expect, it } from 'vitest';
import { threadRow } from '@/modules/messaging/inbox/inbox.fakes';
import { noted } from '@/modules/messaging/inbox/threads/last-unsupported';

const UNAVAILABLE = { type: 'unsupported', errors: [{ code: 131060 }] };
const last = (over: Record<string, unknown> = {}) => ({
  id: 'm1',
  direction: 'inbound' as const,
  interactive_payload: null,
  deleted_at: null,
  ...over,
});
const emptyRow = () =>
  threadRow({ last_body: null, last_media_mime: null, last_template_key: null });

describe('noted (the list row of a last message that does not show itself)', () => {
  it('no last message read: the row as it is', () => {
    const row = threadRow();
    expect(noted(row, undefined)).toBe(row);
  });

  it('a deleted message is a note with no text and no file', () => {
    const out = noted(threadRow({ last_media_mime: 'image/jpeg' }), last({ deleted_at: 'x' }));
    expect(out).toMatchObject({ last_note: 'deleted', last_body: null, last_media_mime: null });
  });

  it('an empty inbound row of Meta\'s unsupported payload is marked, another is not', () => {
    const payload = { interactive_payload: UNAVAILABLE };
    expect(noted(emptyRow(), last(payload))).toMatchObject({ last_unsupported: true });
    expect(noted(threadRow({ last_body: 'hi' }), last(payload))).not.toHaveProperty(
      'last_unsupported',
    );
  });
});
