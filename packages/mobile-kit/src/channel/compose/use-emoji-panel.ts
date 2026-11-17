import { useRef, useState } from 'react';
import { Keyboard, type TextInput } from 'react-native';

/**
 * The composer's emoji panel (the staff inbox's grid): its button swaps the phone's keyboard for
 * the panel, and «لوحة المفاتيح» (or a tap in the box) swaps it back.
 */
export function useEmojiPanel() {
  const input = useRef<TextInput>(null);
  const [open, setOpen] = useState(false);
  const toggle = () => {
    const next = !open;
    setOpen(next);
    const swap = next ? () => Keyboard.dismiss() : () => input.current?.focus();
    swap();
  };
  return { input, open, toggle, close: () => setOpen(false) };
}
