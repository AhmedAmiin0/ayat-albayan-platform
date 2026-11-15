import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ReportTextField } from './ReportTextField';

test('Arabic: the free text follows what is typed, never a pinned side', async () => {
  await render(<ReportTextField label="الواجب" value="مراجعة سورة الملك" onChange={jest.fn()} />);
  const style = StyleSheet.flatten(screen.getByLabelText('الواجب').props.style);
  expect(style.textAlign).toBeUndefined();
  expect(style.writingDirection).toBeUndefined();
  expect(style.textAlignVertical).toBe('top');
});
