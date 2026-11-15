import { describe, expect, it } from 'vitest';
import { template } from '@/features/messaging/inbox/testing/inbox-fixture';
import { draftOf, toEditInput } from './edit-draft';
import { canSave, editState } from './edit-state';

const now = new Date('2026-11-14T12:00:00Z');

describe('the edit draft', () => {
  it('opens on what WhatsApp shows, keeping a quick reply\'s action by index', () => {
    const tpl = template({
      buttons: [{ type: 'quick_reply', text: 'تأكيد', intent: 'confirm' }],
      display: { header: null, buttons: [{ type: 'quick_reply', text: 'تأكيد' }, { type: 'quick_reply', text: 'لا' }] },
    });
    const draft = draftOf(tpl);
    expect(draft.buttons).toEqual([
      { type: 'quick_reply', text: 'تأكيد', intent: 'confirm' },
      { type: 'quick_reply', text: 'لا', intent: '' },
    ]);
    expect(toEditInput(draft).buttons).toEqual([
      { type: 'quick_reply', text: 'تأكيد', intent: 'confirm' },
      { type: 'quick_reply', text: 'لا', intent: undefined },
    ]);
  });

  it('names a blank variable var_n', () => {
    const draft = { ...draftOf(template({ params: [] })), body: 'مرحبًا {{1}} اليوم' };
    expect(toEditInput(draft).params).toEqual([{ name: 'var_1', sample: '' }]);
  });
});

describe('editState', () => {
  it('follows Meta: approved edits on Meta, never-sent ones here, pending waits', () => {
    expect(editState(template({ key: 'offer' }), now)).toEqual({ stage: 'meta', bound: false, nextAt: null });
    expect(editState(template({ status: 'not_submitted' }), now).stage).toBe('local');
    expect(canSave(editState(template({ status: 'pending' }), now))).toBe(false);
    expect(editState(template({ key: 'lesson_reminder' }), now).bound).toBe(true);
  });

  it('an approved template edited in the last day is limited', () => {
    const state = editState(template({ approved_edits: ['2026-11-14T02:00:00Z'] }), now);
    expect([state.stage, state.nextAt, canSave(state)]).toEqual(['limited', '2026-11-15T02:00:00.000Z', false]);
  });
});
