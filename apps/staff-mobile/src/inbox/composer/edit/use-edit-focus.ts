import { useEffect, useRef } from 'react';
import type { TextInput } from 'react-native';
import { useChatActions } from '@/inbox/thread/hooks/chat-actions';

export function useEditFocus() {
  const input = useRef<TextInput | null>(null);
  const editingId = useChatActions().editing?.id;
  useEffect(() => {
    if (editingId) input.current?.focus();
  }, [editingId]);
  return input;
}
