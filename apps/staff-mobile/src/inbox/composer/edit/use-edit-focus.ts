import { useEffect, useRef } from 'react';
import type { TextInput } from 'react-native';
import { useChatActions } from '@/inbox/thread/hooks/chat-actions';

/**
 * The box's input ref; «تعديل» (owner 2026-11-07) focuses it with the original's text in it, as
 * WhatsApp does.
 */
export function useEditFocus() {
  const input = useRef<TextInput | null>(null);
  const editingId = useChatActions().editing?.id;
  useEffect(() => {
    if (editingId) input.current?.focus();
  }, [editingId]);
  return input;
}
