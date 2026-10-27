// Tests only: SwipeReply's responder config, called with a gesture's dx (a real drag needs a touch history).
import { render } from '@testing-library/react-native';
import { type PanResponderCallbacks, type PanResponderGestureState, PanResponder, View } from 'react-native';
import { SwipeReply } from './SwipeReply';

type Pan = Required<Pick<PanResponderCallbacks, 'onMoveShouldSetPanResponder' | 'onPanResponderRelease'>>;

/** Renders one SwipeReply and hands back what a sideways drag of `dx` does: claimed, then answered. */
export async function dragBy(dx: number): Promise<{ claims: boolean; answered: boolean }> {
  const create = jest.spyOn(PanResponder, 'create');
  const onReply = jest.fn();
  await render(<SwipeReply onReply={onReply}><View testID="bubble" /></SwipeReply>);
  const config = create.mock.calls.at(-1)?.[0] as Pan;
  create.mockRestore();
  const gesture = { dx, dy: 0 } as PanResponderGestureState;
  const event = {} as Parameters<Pan['onPanResponderRelease']>[0];
  const claims = config.onMoveShouldSetPanResponder(event, gesture) === true;
  config.onPanResponderRelease(event, gesture);
  return { claims, answered: onReply.mock.calls.length > 0 };
}
