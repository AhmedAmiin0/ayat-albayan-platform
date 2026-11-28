import { type, useTheme } from '../../../theme';
import { useAnnounce } from '../use-announce';

export function useRoomNotice(message: string) {
  const { color } = useTheme();
  useAnnounce(message);
  const line = { textAlign: 'center', fontSize: type.size.sm, color: color.coverInk } as const;
  return { line };
}
