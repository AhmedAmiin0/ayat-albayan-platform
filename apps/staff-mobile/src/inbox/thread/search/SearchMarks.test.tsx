import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SearchMarks } from './SearchMarks';

test('the folded words are lit, tashkeel and hamza kept as written; the rest plain', async () => {
  await render(
    <Text>
      <SearchMarks text="المَدْرَسَة قريبة، والمدرسة جميلة" q="مدرسه" />
    </Text>,
  );
  const marks = screen.getAllByTestId('search-mark').map((m) => m.props.children);
  expect(marks).toEqual(['مَدْرَسَة', 'مدرسة']);
});

test('digits in any script: «12» lights «١٢»', async () => {
  await render(
    <Text>
      <SearchMarks text="الصفحة ١٢" q="12" />
    </Text>,
  );
  expect(screen.getByTestId('search-mark').props.children).toBe('١٢');
});
