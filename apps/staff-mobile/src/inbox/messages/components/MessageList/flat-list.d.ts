// FlatList.js (react-native 0.86) takes strictMode, a documented Flow prop its .d.ts leaves out: it
// memoizes the cell renderer, so a list redraw with the same renderItem skips every cell.
declare module 'react-native/Libraries/Lists/FlatList' {
  interface FlatListProps<ItemT> {
    strictMode?: boolean | undefined;
  }
}

export {};
