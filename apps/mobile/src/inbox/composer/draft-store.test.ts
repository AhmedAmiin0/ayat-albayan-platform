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
    const bound = await renderHook(({ on }: { on: boolean }) => useForgetDraftOnLeave(A, on), { initialProps: { on: false } });
    await bound.rerender({ on: true });
    await bound.unmount();
    expect(getComposerText(A)).toBe('');
    setComposerText(B, 'plain');
    const free = await renderHook(() => useForgetDraftOnLeave(B, false));
    await free.unmount();
    expect(getComposerText(B)).toBe('plain');
  });
});
