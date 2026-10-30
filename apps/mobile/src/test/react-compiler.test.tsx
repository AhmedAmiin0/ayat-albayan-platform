import { render } from '@testing-library/react-native';
import { View } from 'react-native';

// babel.config.cjs: jest runs the code the React Compiler built, as the OTA bundle does. A compiled component
// takes its memo cache from react/compiler-runtime on every render.
jest.mock('react/compiler-runtime', () => {
  const actual = jest.requireActual<{ c: (size: number) => unknown[] }>('react/compiler-runtime');
  return { c: jest.fn(actual.c) };
});

function Probe({ label }: { label: string }) {
  return <View accessibilityLabel={label} />;
}

test('components are compiled under jest (babel.config.cjs)', async () => {
  const { c } = jest.requireMock<{ c: jest.Mock }>('react/compiler-runtime');
  await render(<Probe label="probe" />);
  expect(c).toHaveBeenCalled();
});
