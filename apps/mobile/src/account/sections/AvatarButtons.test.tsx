import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { palette } from '@/theme';
import { AvatarButtons } from './AvatarButtons';

const a = t.account.avatar;
const base = {
  picked: false,
  hasPhoto: true,
  busy: false,
  uploading: false,
  removing: false,
  onPick: jest.fn(),
  onUpload: jest.fn(),
  onCancel: jest.fn(),
  onRemove: jest.fn(),
};
const styleOf = (name: string) => StyleSheet.flatten(screen.getByRole('button', { name }).props.style);
const holds = (label: string) => screen.getAllByTestId('button-row-cell').map((cell) => within(cell).queryByText(label) !== null);

test('docs/07 «الأزرار»: camera | gallery in one ButtonRow, «إزالة الصورة» outlined danger below', async () => {
  await render(<AvatarButtons {...base} />);
  expect(holds(a.camera)).toEqual([true, false]);
  expect(holds(a.library)).toEqual([false, true]);
  expect(styleOf(a.remove)).toMatchObject({ borderWidth: 1, borderColor: palette.light.bad });
  await fireEvent.press(screen.getByRole('button', { name: a.library }));
  expect(base.onPick).toHaveBeenCalledWith('library');
});

test('a preview: «رفع الصورة» filled first, «إلغاء» outlined beside it', async () => {
  await render(<AvatarButtons {...base} picked />);
  expect(holds(a.upload)).toEqual([true, false]);
  expect(holds(t.account.cancel)).toEqual([false, true]);
  expect(styleOf(a.upload)).toMatchObject({ backgroundColor: palette.light.lapisFill });
  expect(screen.queryByRole('button', { name: a.remove })).toBeNull();
});
