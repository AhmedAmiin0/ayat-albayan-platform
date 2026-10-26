import { act, renderHook } from '@testing-library/react-native';
import { WELCOME } from './fixtures';
import { useSavedReplyDraft } from './use-saved-reply';

async function setup(enabled = true) {
  const box = { text: '' };
  const setText = jest.fn((next: string) => (box.text = next));
  const hook = await renderHook(() => useSavedReplyDraft({ text: box.text, setText, enabled }));
  const type = async (next: string) => {
    await act(async () => {
      hook.result.current.typed(next);
      box.text = next;
    });
    await hook.rerender({});
  };
  return { ...hook, type, setText, box };
}

test('«/» at the start docks the list; what follows searches it; deleting the «/» closes it', async () => {
  const { result, type } = await setup();
  await type('/');
  expect(result.current.search).toBe('');
  await type('/تر');
  expect(result.current.search).toBe('تر');
  await type('');
  expect(result.current.search).toBeNull();
});

test('a pick replaces the «/search» and closes the list; nothing else happens', async () => {
  const { result, type, setText } = await setup();
  await type('/');
  await type('/تر');
  await act(async () => result.current.fill('السلام عليكم', WELCOME));
  expect(setText).toHaveBeenLastCalledWith('السلام عليكم');
  expect(result.current.search).toBeNull();
  expect(result.current.staged).toBeNull();
});

test('closed by leaving the box; a teacher’s «/» is plain text', async () => {
  const staff = await setup();
  await staff.type('/');
  await act(async () => staff.result.current.close());
  expect(staff.result.current.search).toBeNull();
  const teacher = await setup(false);
  await teacher.type('/');
  expect(teacher.result.current.search).toBeNull();
});

test('the button opens the sheet, never the docked list', async () => {
  const { result } = await setup();
  await act(async () => result.current.open());
  expect(result.current.sheet).toBe(true);
  expect(result.current.search).toBeNull();
});

test('a pick from the sheet still replaces a «/search» left in the box', async () => {
  const { result, type, setText } = await setup();
  await type('/');
  await type('/تر');
  await act(async () => result.current.open());
  await act(async () => result.current.fill('السلام عليكم', WELCOME));
  expect(setText).toHaveBeenLastCalledWith('السلام عليكم');
});
