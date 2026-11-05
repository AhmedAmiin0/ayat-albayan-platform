import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { LinkedCourseContext, useLinkedCourse } from './linked-course';

const A = '0c000000-0000-4000-8000-00000000000a';
const B = '0c000000-0000-4000-8000-00000000000b';

function setup(first: string | null) {
  let linked = first;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <LinkedCourseContext.Provider value={linked}>{children}</LinkedCourseContext.Provider>
  );
  const view = renderHook(() => useLinkedCourse(), { wrapper });
  const link = (next: string | null) => {
    linked = next;
    view.rerender();
  };
  return { view, link };
}

// «تم الدفع: احجز أيام الحلقات» (owner 2026-11-06) on the web chat.
describe('useLinkedCourse', () => {
  it('opens on the linked student; closing keeps it closed while the link stays', () => {
    const { view, link } = setup(A);
    expect(view.result.current[0]).toBe(A);
    act(() => view.result.current[1](null));
    link(A);
    expect(view.result.current[0]).toBeNull();
  });

  it('a newer notice for the chat already open opens its student; the link dropped changes nothing', () => {
    const { view, link } = setup(null);
    expect(view.result.current[0]).toBeNull();
    link(B);
    expect(view.result.current[0]).toBe(B);
    link(null);
    expect(view.result.current[0]).toBe(B);
  });
});
