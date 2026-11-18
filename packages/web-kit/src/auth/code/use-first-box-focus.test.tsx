import { render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { expect, it } from 'vitest';
import { useFirstBoxFocus } from './use-first-box-focus';

function Boxes() {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  useFirstBoxFocus(refs);
  return [0, 1].map((i) => (
    <input
      key={i}
      aria-label={`box ${String(i)}`}
      ref={(el) => {
        refs.current[i] = el;
      }}
    />
  ));
}

// Refused boxes are replaced (re-keyed): the first new box holds the focus in the same commit, so
// nothing that runs after it (a sibling's ref, the error shown with it) finds the focus on <body>.
it('focuses the first box in the commit that mounts it', () => {
  const seen: (Element | null)[] = [];
  // A ref is set in the commit, after the boxes before it (null: the old one, detached).
  const probe = (el: HTMLSpanElement | null) => {
    seen.push(...(el ? [document.activeElement] : []));
  };
  const { rerender } = render(<><Boxes key="a" /><span ref={probe} /></>);
  rerender(<><Boxes key="b" /><span ref={(el) => probe(el)} /></>);
  expect(seen.map((el) => el?.getAttribute('aria-label'))).toEqual(['box 0', 'box 0']);
});
