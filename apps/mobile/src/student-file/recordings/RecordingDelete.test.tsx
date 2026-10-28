import { fireEvent, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { palette } from '@/theme';
import { RecordingDelete } from './RecordingDelete';

const D = t.mobileStudentFile.recordings.delete;

test('docs/07 «الأزرار»: «حذف التسجيل» is the outlined danger button; it asks before deleting', async () => {
  await renderWithQuery(<RecordingDelete id="r1" studentId="s1" />);
  const button = screen.getByRole('button', { name: D.action });
  expect(StyleSheet.flatten(button.props.style)).toMatchObject({ borderWidth: 1, borderColor: palette.light.bad });
  await fireEvent.press(button);
  expect(screen.getByText(D.question)).toBeTruthy();
  expect(screen.getByRole('button', { name: D.confirm })).toBeTruthy();
});
