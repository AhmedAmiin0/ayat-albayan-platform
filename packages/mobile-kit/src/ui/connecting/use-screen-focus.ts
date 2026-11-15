import { NavigationContext } from 'expo-router/build/react-navigation/core/NavigationContext';
import { useContext, useEffect, useState } from 'react';

/**
 * Whether this screen is the focused one (a tab or stack screen under it is not). Outside a navigator
 * (a test, a sheet's own tree) it counts as focused. Read from the context, not expo-router's
 * useIsFocused, so it also works where a test mocks 'expo-router'.
 */
export function useScreenFocused(): boolean {
  const navigation = useContext(NavigationContext);
  const [focused, setFocused] = useState(() => navigation?.isFocused() ?? true);
  useEffect(() => {
    if (!navigation) return undefined;
    const sync = () => setFocused(navigation.isFocused());
    sync();
    const offFocus = navigation.addListener('focus', sync);
    const offBlur = navigation.addListener('blur', sync);
    return () => {
      offFocus();
      offBlur();
    };
  }, [navigation]);
  return focused;
}
