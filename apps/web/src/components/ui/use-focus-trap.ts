import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
}

/** Open traps, innermost last: only it answers keys while focus is lost on <body>. */
const open: HTMLElement[] = [];

/** Whether this trap owns the key: focus is inside it, or lost on <body> and it is the innermost. */
function owns(node: HTMLElement): boolean {
  const active = document.activeElement;
  if (active && active !== document.body) return node.contains(active);
  return open.at(-1) === node;
}

/** Tab past the last control → the first; Shift+Tab past the first → the last; lost → in. */
function cycle(node: HTMLElement, e: KeyboardEvent): void {
  const items = focusables(node);
  if (items.length === 0) return e.preventDefault();
  const active = document.activeElement;
  const lost = !active || active === document.body || active === node;
  const [edge, wrapTo] = e.shiftKey ? [items[0], items.at(-1)] : [items.at(-1), items[0]];
  if (lost || active === edge) {
    e.preventDefault();
    wrapTo?.focus();
  }
}

/**
 * Modal focus handling: moves focus in (first `[data-autofocus]`, else the first control that is
 * not the close button), keeps Tab / Shift+Tab inside, calls `onEscape` on Esc, and returns focus
 * to whatever had it when the trap unmounts. Keys are heard on the document, so Esc and Tab still
 * work when the focused control was removed (a form swapped in) and focus fell to <body>.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, onEscape: () => void): void {
  const escape = useRef(onEscape);
  useEffect(() => {
    escape.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const start =
      node.querySelector<HTMLElement>('[data-autofocus]') ??
      focusables(node).find((el) => !el.hasAttribute('data-dialog-close')) ??
      node;
    start.focus({ preventScroll: true }); // phones: keep the title in view, not the footer button
    open.push(node);

    const onKey = (e: KeyboardEvent) => {
      if (!owns(node)) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        escape.current();
      } else if (e.key === 'Tab') {
        cycle(node, e);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      open.splice(open.indexOf(node), 1);
      previous?.focus();
    };
  }, [ref]);
}
