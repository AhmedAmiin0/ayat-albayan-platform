import { useId, useRef, type ClipboardEvent, type KeyboardEvent } from 'react';
import { keyStep, typeInto, type BoxesState } from '@ab/web-kit/auth/code/code-boxes';
import { useFirstBoxFocus } from '@ab/web-kit/auth/code/use-first-box-focus';
import type { CodeBoxesProps } from './CodeBoxes.types';

export function useCodeBoxes({ digits, onDigits, invalid }: CodeBoxesProps) {
  const labelId = useId();
  const boxesRef = useRef<(HTMLInputElement | null)[]>([]);
  useFirstBoxFocus(boxesRef);
  const apply = (next: BoxesState) => {
    onDigits(next.boxes);
    boxesRef.current[next.focus]?.focus();
  };
  const boxRef = (at: number) => (el: HTMLInputElement | null) => {
    boxesRef.current[at] = el;
  };
  const onType = (at: number, text: string) => apply(typeInto(digits, at, text));
  const onKeyDown = (at: number, e: KeyboardEvent<HTMLInputElement>) => {
    const next = keyStep(e.key, at, digits);
    if (!next) return;
    e.preventDefault();
    apply(next);
  };
  const onPaste = (at: number, e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    onType(at, e.clipboardData.getData('text'));
  };
  return { digits, invalid, labelId, boxRef, onType, onKeyDown, onPaste };
}
