import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { clearAllDrafts, getDraft, setDraft } from '@/features/messaging/inbox/composer/lib/draft-store';
import { message, PHONE } from '@/features/messaging/inbox/testing/inbox-fixture';
import { usePicks } from './use-picks';

// Review of PR #694 (1, 4, 5): an edit that ends without a send gives the box its draft back; a
// correction is edited without its prefix.
const OWN = message({ id: 'own', direction: 'outbound', status: 'sent', body: 'الساعة الخامسة' });
const FIX = message({ id: 'fix', direction: 'outbound', body: 'تصحيح: الساعة السادسة' });
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

  it('its sent correction ends it with no draft back (the box is the send’s)', () => {
    const { result, unmount } = start();
    setDraft(PHONE, { text: '', failed: null });
    act(() => result.current.cancelEdit(OWN.id));
    unmount();
    expect([result.current.editing, typed()]).toEqual([null, '']);
  });

  it('a second «تعديل» keeps the first draft; a correction is edited without its prefix', () => {
    const { result } = start();
    act(() => result.current.edit({ ...FIX, corrects_id: OWN.id }));
    expect(typed()).toBe('الساعة السادسة');
    act(() => result.current.cancelEdit());
    expect(typed()).toBe('مسودتي');
  });
});
