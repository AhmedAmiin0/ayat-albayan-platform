import { useNativeState } from '@expo/ui';
import { useEffect, useRef, useState } from 'react';
import type { FieldInput } from './Field/Field.types';

/**
 * The screen's string value as @expo/ui's observable native text. Typing writes the native text
 * itself; the screen's value is written back only when it differs from what was typed (a reset, a
 * cleaned or inserted value), so a keystroke never rewrites the text under the cursor. Each
 * keystroke re-runs the check: a screen that cleans it back to the value it already held does not
 * re-render, and the native text would keep the rejected character.
 */
export function useNativeText({ value, onChangeText }: Pick<FieldInput, 'value' | 'onChangeText'>) {
  const text = useNativeState(value ?? '');
  const typed = useRef(value ?? '');
  const [keystrokes, setKeystrokes] = useState(0);
  useEffect(() => {
    if (value === undefined || value === typed.current) return;
    typed.current = value;
    text.set(value);
  }, [text, value, keystrokes]);
  const onChange = (next: string) => {
    typed.current = next;
    setKeystrokes((n) => n + 1);
    onChangeText?.(next);
  };
  return { text, onChange };
}
