import { render } from '@testing-library/react-native';
import { View } from 'react-native';
import { useScrollToInvalid } from './use-scroll-to-invalid';

function Form({ scroll, firstInvalid }: { scroll: never; firstInvalid: string | null }) {
  const register = useScrollToInvalid(scroll, { problem: firstInvalid ? 'missing_grades' : null, firstInvalid });
  return <View ref={register('overall')} />;
}

const field = (y: number) => ({ measureLayout: jest.fn((_inner: unknown, ok: (x: number, y: number) => void) => ok(0, y)) });

test('scrolls the ScrollView to the first invalid question (16 above it), only after a failed send', async () => {
  const scrollTo = jest.fn();
  const scroll = { current: { getInnerViewNode: () => 7, scrollTo } } as never;
  // The View ref is the host component: give it measureLayout like a native view has.
  const measure = field(480);
  jest.spyOn(View.prototype as unknown as { measureLayout: () => void }, 'measureLayout' as never).mockImplementation(measure.measureLayout as never);
  await render(<Form scroll={scroll} firstInvalid={null} />);
  expect(scrollTo).not.toHaveBeenCalled();
  await render(<Form scroll={scroll} firstInvalid="overall" />);
  expect(scrollTo).toHaveBeenCalledWith({ y: 464, animated: true });
});

test('without a ScrollView (a single card, tests) it does nothing', async () => {
  await render(<Form scroll={undefined as never} firstInvalid="overall" />);
});
