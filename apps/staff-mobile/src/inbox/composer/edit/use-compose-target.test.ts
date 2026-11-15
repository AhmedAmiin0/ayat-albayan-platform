import { act, renderHook } from '@testing-library/react-native';
import { getComposerText, setComposerText } from '@/inbox/composer/draft-store';
import { message } from '@/inbox/shared/thread-fixtures';
import { useComposeTarget } from './use-compose-target';

// Review of PR #694 (1, 4, 5) and its follow-up (4, 6): the box's draft around «تعديل».
const A = '+966552147730';
const B = '+966552147731';
const own = message({ id: 'o1', body: 'الساعة الخامسة' });
const other = message({ id: 'o2', body: 'الساعة السادسة' });

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

test('its sent correction ends it and gives the empty box its draft back (follow-up item 6)', async () => {
  const { result, unmount } = await editing();
  const session = result.current.editSession ?? '';
  setComposerText(A, '');
  await act(async () => result.current.editSent(session));
  await unmount();
  expect([result.current.editing, getComposerText(A)]).toEqual([null, 'مسودتي']);
});

test('a sent correction never overwrites text typed into the box since', async () => {
  const { result } = await editing();
  const session = result.current.editSession ?? '';
  setComposerText(A, 'نص جديد');
  await act(async () => result.current.editSent(session));
  expect([result.current.editing, getComposerText(A)]).toEqual([null, 'نص جديد']);
});

test('«تعديل» again while the first correction is in flight: its success ends neither (item 4)', async () => {
  const { result } = await editing();
  const first = result.current.editSession ?? '';
  setComposerText(A, ''); // the first correction left the box
  await act(async () => result.current.startEdit(own));
  expect(result.current.editSession).not.toBe(first);
  await act(async () => result.current.editSent(first));
  expect([result.current.editing?.id, getComposerText(A)]).toEqual(['o1', 'الساعة الخامسة']);
  await act(async () => result.current.cancelEdit());
  expect(getComposerText(A)).toBe('مسودتي');
});

test('a second «تعديل» puts the other text in the box; the first draft is kept', async () => {
  const { result } = await editing();
  await act(async () => result.current.startEdit(other));
  expect(getComposerText(A)).toBe('الساعة السادسة');
  await act(async () => result.current.cancelEdit());
  expect(getComposerText(A)).toBe('مسودتي');
});
