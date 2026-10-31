import { describe, expect, it } from 'vitest';
import type { MessageView } from '../chat/views.js';
import { withMarks } from './message-marks.js';

const view = {
  id: 'm1',
  body: 'الواجب: سورة الملك',
  media_mime: 'image/jpeg',
  media_url: 'https://storage.example/x.jpg',
  media_name: 'x.jpg',
  interactive_payload: { type: 'image' },
  replyable: true,
  forwardable: true,
  click_to_chat: null,
} as unknown as MessageView;

describe('withMarks', () => {
  it('leaves an untouched row as it is', () => {
    expect(withMarks(view, {})).toBe(view);
    expect(withMarks(view, { edited_at: null, deleted_at: null })).toBe(view);
  });

  it('an edited row is marked, its (new) text shown', () => {
    expect(withMarks(view, { edited_at: '2026-10-30T10:00:00Z' })).toEqual({
      ...view,
      edited: true,
    });
  });

  it('a deleted row withholds text, file and payload and cannot be quoted or forwarded', () => {
    const out = withMarks(view, {
      deleted_at: '2026-10-30T10:00:00Z',
      edited_at: '2026-10-30T09:00:00Z',
    });
    expect(out).toMatchObject({
      deleted: true,
      body: null,
      media_mime: null,
      media_url: null,
      media_name: null,
      interactive_payload: null,
      replyable: false,
      forwardable: false,
    });
    expect(out.edited).toBeUndefined();
  });
});
