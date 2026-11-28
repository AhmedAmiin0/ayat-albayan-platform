import { useNativeState } from '@expo/ui';
import { useEffect, useRef } from 'react';
import type { FieldInput } from './Field/Field.types';

/**
 * The screen's string value as @expo/ui's observable native text. Typing writes the native text
 * itself; the screen's value is written back only when it differs from what was typed (a reset, a
 * cleaned or inserted value), so a keystroke never rewrites the text under the cursor.
 */
export function useNativeText({ value, onChangeText }: Pick<FieldInput, 'value' | 'onChangeText'>) {
  const text = useNativeState(value ?? '');
  const typed = useRef(value ?? '');
  useEffect(() => {
    if (value === undefined || value === typed.current) return;
    typed.current = value;
    text.set(value);
  }, [text, value]);
  const onChange = (next: string) => {
    typed.current = next;
    onChangeText?.(next);
  };
  return { text, onChange };
}
