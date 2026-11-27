import { use } from 'react';
import { useTabBarInset } from '../tab-bar-inset';
import type { ScreenShape } from './Screen.types';
import { FullScreenContext } from './full-screen-context';
import { bodyStyle, edgesOf, scrollStyle } from './screen.helpers';

export function useScreen({ chat, list, sheet }: Required<ScreenShape>) {
  const bar = useTabBarInset();
  const fullScreen = use(FullScreenContext);
  const inset = sheet ? 0 : bar;
  return {
    edges: edgesOf(chat || fullScreen),
    scroll: scrollStyle(inset),
    body: bodyStyle(chat || list, inset),
  };
}
