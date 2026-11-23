import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook } from '@testing-library/react-native';
import { z } from 'zod';
import { REPORT_DRAFTS_KEY } from './draft-storage';
import { useStoredDraft } from './use-stored-draft';

const schema = z.object({ notes: z.string() });
const stored = JSON.stringify({ 'r-1': '{"notes":"محفوظ"}' });

function mount(restore: jest.Mock, enabled = true) {
  return renderHook((props: { body: string }) =>
    useStoredDraft({ id: 'r-1', enabled, schema, body: props.body, restore }),
    { initialProps: { body: '{}' } },
  );
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

test('restores the kept body when the card opens', async () => {
  await AsyncStorage.setItem(REPORT_DRAFTS_KEY, stored);
  const restore = jest.fn();
  await mount(restore);
  await act(() => new Promise((done) => setTimeout(done, 20)));
  expect(restore).toHaveBeenCalledWith({ notes: 'محفوظ' });
});

test('typing before the kept copy is read wins over it', async () => {
  let answer: (raw: string) => void = () => undefined;
  jest.spyOn(AsyncStorage, 'getItem').mockReturnValueOnce(new Promise((done) => (answer = done)));
  const restore = jest.fn();
  const { rerender } = await mount(restore);
  await rerender({ body: '{"notes":"جديد"}' });
  await act(async () => answer(stored));
  expect(restore).not.toHaveBeenCalled();
});

test('a sent report restores nothing', async () => {
  await AsyncStorage.setItem(REPORT_DRAFTS_KEY, stored);
  const restore = jest.fn();
  await mount(restore, false);
  await act(() => new Promise((done) => setTimeout(done, 20)));
  expect(restore).not.toHaveBeenCalled();
});

test('a copy of the wrong shape restores nothing', async () => {
  await AsyncStorage.setItem(REPORT_DRAFTS_KEY, JSON.stringify({ 'r-1': '{"notes":5}' }));
  const restore = jest.fn();
  await mount(restore);
  await act(() => new Promise((done) => setTimeout(done, 20)));
  expect(restore).not.toHaveBeenCalled();
});
