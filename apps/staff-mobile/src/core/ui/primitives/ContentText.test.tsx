import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ContentText } from './ContentText';

// The Arabic UI (jest.setup: RTL). 'left' is the start (right), 'right' the end (left).
const align = (text: string) => StyleSheet.flatten(screen.getByText(text).props.style).textAlign;

test('Arabic text stays at the start, English goes to the other side', async () => {
  await render(
    <>
      <ContentText source="السلام عليكم">السلام عليكم</ContentText>
      <ContentText source="Hello there">Hello there</ContentText>
    </>,
  );
  expect(align('السلام عليكم')).toBe('left');
  expect(align('Hello there')).toBe('right');
});

test('digits only follow the UI; a caller style still wins', async () => {
  await render(
    <>
      <ContentText source="12:30">12:30</ContentText>
      <ContentText source="Hi" style={{ textAlign: 'center' }}>
        Hi
      </ContentText>
    </>,
  );
  expect(align('12:30')).toBe('left');
  expect(align('Hi')).toBe('center');
});
