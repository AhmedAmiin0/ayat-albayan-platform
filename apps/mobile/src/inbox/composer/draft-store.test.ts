import { act, renderHook } from '@testing-library/react-native';
import { getComposerText, setComposerText, useComposerText } from './draft-store';

const A = '+966501234567';
const B = '+971501234567';

describe('composer draft store («عرض سعر» fills the box)', () => {
  afterEach(() => {
    setComposerText(A, '');
    setComposerText(B, '');
  });

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

  it('forgets the chat when its box unmounts (leaving the chat, a sign-out)', async () => {
    const { unmount } = await renderHook(() => useComposerText(A));
    await act(() => setComposerText(A, 'draft'));
    await unmount();
    expect(getComposerText(A)).toBe('');
  });

  it('keeps the text while another box of the same chat is still mounted (a stacked screen)', async () => {
    const first = await renderHook(() => useComposerText(A));
    const second = await renderHook(() => useComposerText(A));
    await act(() => setComposerText(A, 'draft'));
    await second.unmount();
    expect(getComposerText(A)).toBe('draft');
    expect(first.result.current[0]).toBe('draft');
    await first.unmount();
    expect(getComposerText(A)).toBe('');
  });
});
