import { router, usePathname } from 'expo-router';
import { NavigationContext } from 'expo-router/build/react-navigation/core/NavigationContext';
import { NavigationRouteContext } from 'expo-router/build/react-navigation/core/NavigationProvider';
import { use, useEffect, useEffectEvent } from 'react';
import { BackHandler } from 'react-native';
import { tabListBack } from './tab-list-back';

const replaced = (list: string): true => {
  router.replace(list);
  return true;
};

/**
 * Android's back on a tab's lone detail screen (opened from another tab, a push or a link with
 * nothing beneath) goes to the tab's own list, as the header's back (backWithin), never to Today.
 * Mounted once per tab stack (TabStack). Android runs the newest handler first: a screen's handler
 * added after the tab stack mounted (useSearchBack) runs before this one; one a lone detail screen
 * adds on the stack's first mount runs after it (none does today).
 */
export function useTabListBack(): void {
  const navigation = use(NavigationContext);
  const route = use(NavigationRouteContext);
  const pathname = usePathname();
  const onBack = useEffectEvent(() => {
    const list = tabListBack({
      pathname,
      tab: route?.name ?? '',
      focused: navigation?.isFocused() ?? false,
      canDismiss: router.canDismiss(),
    });
    return list === null ? false : replaced(list);
  });
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, []);
}
