import { useFadeOpacity } from '../../use-fade-opacity';

export function useFadeIn() {
  return { opacity: useFadeOpacity() };
}
