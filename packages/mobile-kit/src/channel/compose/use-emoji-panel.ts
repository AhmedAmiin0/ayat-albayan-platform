import { useRef, useState } from 'react';
import { Keyboard, type TextInput } from 'react-native';

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
