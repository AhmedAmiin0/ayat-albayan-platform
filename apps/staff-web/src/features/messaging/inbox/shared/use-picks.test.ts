import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { clearAllDrafts, getDraft, setDraft } from '@/features/messaging/inbox/composer/lib/draft-store';
import { message, PHONE } from '@/features/messaging/inbox/testing/inbox-fixture';
import { usePicks } from './use-picks';

// Review of PR #694 (1, 4, 5) and its follow-up (4, 6): the box's draft around «تعديل».
const OWN = message({ id: 'own', direction: 'outbound', status: 'sent', body: 'الساعة الخامسة' });
const OTHER = message({ id: 'other', direction: 'outbound', body: 'الساعة السادسة' });
const typed = () => getDraft(PHONE).text;

const start = () => {
  setDraft(PHONE, { text: 'مسودتي', failed: null });
  const hook = renderHook(() => usePicks(PHONE));
  act(() => hook.result.current.edit(OWN));
  expect(typed()).toBe('الساعة الخامسة');
  return hook;
};

afterEach(clearAllDrafts);

describe('usePicks: the box around «تعديل»', () => {
  it('✕ ends the edit and brings the draft back', () => {
    const { result } = start();
    act(() => result.current.cancelEdit());
    expect([result.current.editing, typed()]).toEqual([null, 'مسودتي']);
  });

  it('«رد» during an edit ends it the same way and picks the reply', () => {
    const { result } = start();
    act(() => result.current.reply(OWN));
    expect([result.current.editing, result.current.target?.id, typed()]).toEqual([
      null,
      OWN.id,
      'مسودتي',
    ]);
  });

  it('leaving the chat mid-edit brings the draft back', () => {
    const { unmount } = start();
    unmount();
    expect(typed()).toBe('مسودتي');
  });

  it('its sent correction ends it and gives the empty box its draft back (follow-up item 6)', () => {
    const { result, unmount } = start();
    const session = result.current.editSession ?? '';
    setDraft(PHONE, { text: '', failed: null });
    act(() => result.current.cancelEdit(session));
    unmount();
    expect([result.current.editing, typed()]).toEqual([null, 'مسودتي']);
  });

  it('a sent correction never overwrites text typed into the box since', () => {
    const { result } = start();
    const session = result.current.editSession ?? '';
    setDraft(PHONE, { text: 'نص جديد', failed: null });
    act(() => result.current.cancelEdit(session));
    expect([result.current.editing, typed()]).toEqual([null, 'نص جديد']);
  });

  it('«تعديل» again while the first correction is in flight: its success ends neither (item 4)', () => {
    const { result } = start();
    const first = result.current.editSession ?? '';
    setDraft(PHONE, { text: '', failed: null }); // the first correction left the box
    act(() => result.current.edit(OWN));
    expect(result.current.editSession).not.toBe(first);
    act(() => result.current.cancelEdit(first));
    expect([result.current.editing?.id, typed()]).toEqual([OWN.id, 'الساعة الخامسة']);
    act(() => result.current.cancelEdit());
    expect(typed()).toBe('مسودتي');
  });

  it('a second «تعديل» keeps the first draft and puts the other text in the box', () => {
    const { result } = start();
    act(() => result.current.edit(OTHER));
    expect(typed()).toBe('الساعة السادسة');
    act(() => result.current.cancelEdit());
    expect(typed()).toBe('مسودتي');
  });

  it('leaving the chat after a sign-out writes nothing back (round 4, item 5)', () => {
    const { unmount } = start();
    clearAllDrafts();
    unmount();
    expect(typed()).toBe('');
  });
});
