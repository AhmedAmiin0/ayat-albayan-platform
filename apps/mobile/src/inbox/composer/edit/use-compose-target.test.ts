import { act, renderHook } from '@testing-library/react-native';
import { getComposerText, setComposerText } from '@/inbox/composer/draft-store';
import { message } from '@/inbox/shared/thread-fixtures';
import { useComposeTarget } from './use-compose-target';

// Review of PR #694 (1, 4, 5): an edit that ends without a send gives the box its draft back; a
// correction is edited without its prefix.
const A = '+966552147730';
const B = '+966552147731';
const own = message({ id: 'o1', body: 'الساعة الخامسة' });
const fix = message({ id: 'c1', body: 'تصحيح: الساعة السادسة', corrects_id: 'o1' });

async function editing(phone = A) {
  setComposerText(phone, 'مسودتي');
  const hook = await renderHook((p: string) => useComposeTarget(p), { initialProps: phone });
  await act(async () => hook.result.current.startEdit(own));
  expect(getComposerText(phone)).toBe('الساعة الخامسة');
  return hook;
}

beforeEach(() => [A, B].forEach((p) => setComposerText(p, '')));

test('✕ ends the edit and brings the draft back', async () => {
  const { result } = await editing();
  await act(async () => result.current.cancelEdit());
  expect([result.current.editing, getComposerText(A)]).toEqual([null, 'مسودتي']);
});

test('a picked «رد» ends the edit the same way', async () => {
  const { result } = await editing();
  await act(async () => result.current.setReply(own));
  expect([result.current.editing, result.current.reply?.id, getComposerText(A)]).toEqual([
    null,
    'o1',
    'مسودتي',
  ]);
});

test('another chat, or the screen closed, mid-edit brings the draft back', async () => {
  const { result, rerender, unmount } = await editing();
  await rerender(B);
  expect([result.current.editing, getComposerText(A)]).toEqual([null, 'مسودتي']);
  setComposerText(A, 'نص آخر');
  await unmount();
  expect(getComposerText(A)).toBe('نص آخر');
});

test('its sent correction ends it with no draft back', async () => {
  const { result, unmount } = await editing();
  setComposerText(A, '');
  await act(async () => result.current.editSent('o1'));
  await unmount();
  expect([result.current.editing, getComposerText(A)]).toEqual([null, '']);
});

test('a correction is edited without its prefix; the first draft is kept', async () => {
  const { result } = await editing();
  await act(async () => result.current.startEdit(fix));
  expect(getComposerText(A)).toBe('الساعة السادسة');
  await act(async () => result.current.cancelEdit());
  expect(getComposerText(A)).toBe('مسودتي');
});
