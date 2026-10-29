import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { MenuSheet } from '../../shared/MenuSheet';

/** iOS presents one modal at a time: what an item opens (the copy sheet, «القوائم») waits for this one to close. */
const AFTER_MENU_MS = Platform.OS === 'ios' ? 350 : 0;

export interface ThreadMenuItem {
  label: string;
  onPress: () => void;
}

interface ThreadMenuProps {
  open: boolean;
  /** In order; each closes the menu, then runs. */
  items: readonly ThreadMenuItem[];
  /** What a screen reader calls the sheet (default «خيارات المحادثة»). */
  label?: string;
  onClose: () => void;
}

/**
 * The chat header's «⋮» (review 2026-10-29 #13, C5): the header keeps the call and this one button so
 * the name gets the width on a 360dp Android. A bottom sheet as the bubble menu: one full-width
 * secondary button per action (no primary: none outranks the others), then «إلغاء»; 48pt each.
 */
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
    <MenuSheet open={open} label={label} testID="thread-menu" onClose={onClose}>
      {items.map((item) => (
        <Button key={item.label} variant="secondary" label={item.label} onPress={() => run(item)} />
      ))}
      <Button variant="secondary" label={t.common.cancel} onPress={onClose} />
    </MenuSheet>
  );
}
