import { fireEvent, screen } from '@testing-library/react-native';

/** Pull-to-refresh on the first list on screen that has one (the FlatList's onRefresh). */
export async function pullToRefresh(): Promise<void> {
  const [list] = screen.container.queryAll((node) => typeof node.props['onRefresh'] === 'function');
  if (!list) throw new Error('no pull-to-refresh on screen');
  await fireEvent(list, 'refresh');
}
