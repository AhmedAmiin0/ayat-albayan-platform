import { WithHome } from '@/features/shell';
import { Picked } from './Picked';
import type { WithPickProps } from './WithPick.types';

/** docs/50 §6: the picker shows in place until a guardian of several picks. */
export function WithPick({ children }: WithPickProps) {
  return <WithHome>{(home) => <Picked home={home} page={children} />}</WithHome>;
}
