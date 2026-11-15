import { act, renderHook } from '@testing-library/react-native';
import {
  appendComposerText,
  clearComposerDrafts,
  getComposerText,
  setComposerText,
  useComposerDraft,
  useComposerText,
  useForgetDraftOnLeave,
} from './draft-store';

const A = '+966501234567';
const B = '+971501234567';

/** The staged file's bound text (null: none staged). */
interface Bound {
  on: string | null;
}
const staging = (phone: string) =>
  renderHook(({ on }: Bound) => useForgetDraftOnLeave(phone, on), { initialProps: { on: null } });

describe('composer draft store («عرض سعر» fills the box; drafts kept until sign-out)', () => {
  afterEach(() => clearComposerDrafts());

  it('keeps one text per chat', () => {
    setComposerText(A, 'hello');
    expect(getComposerText(A)).toBe('hello');
    expect(getComposerText(B)).toBe('');
  });

  it('re-renders the box when the sheet fills it, and accepts an updater', async () => {
    const { result } = await renderHook(() => useComposerText(A));
    await act(() => setComposerText(A, 'offer'));
    expect(result.current[0]).toBe('offer');
    await act(() => result.current[1]((now: string) => `${now}!`));
    expect(result.current[0]).toBe('offer!');
    await act(() => result.current[1](''));
    expect(getComposerText(A)).toBe('');
  });

  it('keeps the draft when the box unmounts (leaving the chat), and a new box shows it again', async () => {
    const { unmount } = await renderHook(() => useComposerText(A));
    await act(() => setComposerText(A, 'draft'));
    await unmount();
    expect(getComposerText(A)).toBe('draft');
    const back = await renderHook(() => useComposerText(A));
    expect(back.result.current[0]).toBe('draft');
  });

  it('a sign-out forgets every chat and redraws the readers', async () => {
    setComposerText(A, 'one');
    setComposerText(B, 'two');
    const row = await renderHook(() => useComposerDraft(A));
    expect(row.result.current).toBe('one');
    await act(() => clearComposerDrafts());
    expect(row.result.current).toBe('');
    expect(getComposerText(B)).toBe('');
  });

  it('another screen appends after her draft, never over it', () => {
    appendComposerText(A, 'link');
    expect(getComposerText(A)).toBe('link');
    setComposerText(A, 'half ');
    appendComposerText(A, 'link');
    expect(getComposerText(A)).toBe('half\nlink');
  });

  it('leaving with a saved reply’s file staged forgets the text; without one it stays', async () => {
    setComposerText(A, 'with file');
    const bound = await staging(A);
    await bound.rerender({ on: 'with file' });
    await bound.unmount();
    expect(getComposerText(A)).toBe('');
    setComposerText(B, 'plain');
    const free = await renderHook(() => useForgetDraftOnLeave(B, null));
    await free.unmount();
    expect(getComposerText(B)).toBe('plain');
  });

  it('a draft an edit restored (not the staged reply’s text) survives leaving (#694 round 4)', async () => {
    setComposerText(A, 'reply text');
    const bound = await renderHook(() => useForgetDraftOnLeave(A, 'reply text'));
    setComposerText(A, 'my draft'); // the edit's restore ran first
    await bound.unmount();
    expect(getComposerText(A)).toBe('my draft');
  });

  it('a staged reply’s text changed before «تعديل» goes too (#694 follow-up item 5)', async () => {
    const bound = await staging(A);
    await bound.rerender({ on: 'reply text' });
    await bound.rerender({ on: 'reply text, changed' });
    await bound.rerender({ on: 'the original' }); // «تعديل»: the box holds the original
    setComposerText(A, 'reply text, changed'); // the edit's restore ran first
    await bound.unmount();
    expect(getComposerText(A)).toBe('');
  });

  it('once the file is sent or removed, the texts it held are free again', async () => {
    const bound = await staging(A);
    await bound.rerender({ on: 'reply text' });
    await bound.rerender({ on: null });
    setComposerText(A, 'reply text');
    await bound.unmount();
    expect(getComposerText(A)).toBe('reply text');
  });
});
