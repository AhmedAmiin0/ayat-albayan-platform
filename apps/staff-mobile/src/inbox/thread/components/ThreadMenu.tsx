import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { t, Button, Sheet } from '@ab/mobile-kit';

/** iOS presents one modal at a time, so what an item opens waits for this one to close. */
const AFTER_MENU_MS = Platform.OS === 'ios' ? 350 : 0;

export interface ThreadMenuItem {
  label: string;
  onPress: () => void;
}

interface ThreadMenuProps {
  open: boolean;
  /** In order; each closes the menu, then runs. */
  items: readonly ThreadMenuItem[];
  label?: string;
  onClose: () => void;
}

/** One overflow button leaves the name the width on a 360dp Android; no item outranks another. */
export function ThreadMenu({ open, items, label = t.inbox.chatMenu, onClose }: ThreadMenuProps) {
  // A chat left within the wait never runs its pending action (a push from a closed chat).
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (pending.current) clearTimeout(pending.current);
  }, []);
  const run = (item: ThreadMenuItem) => {
    onClose();
    pending.current = setTimeout(item.onPress, AFTER_MENU_MS);
  };
  return (
    <Sheet open={open} label={label} testID="thread-menu" onClose={onClose}>
      {items.map((item) => (
        <Button key={item.label} variant="secondary" label={item.label} onPress={() => run(item)} />
      ))}
      <Button variant="secondary" label={t.common.cancel} onPress={onClose} />
    </Sheet>
  );
}
