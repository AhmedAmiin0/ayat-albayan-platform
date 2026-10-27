import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ContentText } from './ContentText';

// An English run: the native flag is LTR (jest.setup reports RTL, the Arabic default).
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});

const align = (text: string) => StyleSheet.flatten(screen.getByText(text).props.style).textAlign;

test('English UI: English at the start (left), Arabic on the right', async () => {
  await render(
    <>
      <ContentText source="Hello there">Hello there</ContentText>
      <ContentText source="السلام عليكم">السلام عليكم</ContentText>
      <ContentText source="+966 55 214 7730">+966 55 214 7730</ContentText>
    </>,
  );
  expect(align('Hello there')).toBe('left');
  expect(align('السلام عليكم')).toBe('right');
  expect(align('+966 55 214 7730')).toBe('left');
});
