import { CommonActions } from 'expo-router/react-navigation';
import type { TabRouteItem, TabRoutesProps } from './TabRoutes.types';

type Route = TabRoutesProps['state']['routes'][number];

const pressOf =
  ({ state, navigation }: TabRoutesProps, route: Route, focused: boolean) =>
  () => {
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (focused || event.defaultPrevented) return;
    navigation.dispatch({ ...CommonActions.navigate(route), target: state.key });
  };

/** One item per route; Tabs.Screen is made from `tabs`, so the filter only narrows the type. */
export function tabRouteItems(props: TabRoutesProps): TabRouteItem[] {
  return props.state.routes.flatMap((route, index) => {
    const tab = props.tabs.find((item) => item.name === route.name);
    const focused = index === props.state.index;
    return tab ? [{ key: route.key, tab, focused, onPress: pressOf(props, route, focused) }] : [];
  });
}
