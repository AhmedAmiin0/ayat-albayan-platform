import type { MessageView } from '../chat/views.js';

// A view's edit / delete marks (owner 2026-10-30) from messages.edited_at / deleted_at (migration
// 992). A message deleted for everyone keeps its row (audit) but nobody reads it again: its text,
// file and payload are withheld, and it can no longer be quoted, forwarded or handed off.

interface MarkedRow {
  edited_at?: string | null;
  deleted_at?: string | null;
}

export function withMarks(view: MessageView, row: MarkedRow): MessageView {
  if (row.deleted_at) {
    return {
      ...view,
      deleted: true,
      body: null,
      media_mime: null,
      media_url: null,
      media_name: null,
      interactive_payload: null,
      template: null,
      replyable: false,
      forwardable: false,
      click_to_chat: null,
    };
  }
  return row.edited_at ? { ...view, edited: true } : view;
}
