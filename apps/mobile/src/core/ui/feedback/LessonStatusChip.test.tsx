import { render, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { confirmingQueryClient, noConfirmQueryClient, renderWithQuery } from '@/test/query';
import { LessonStatusChip } from './LessonStatusChip';

test('no confirmation required (OFF): «قادمة» in a row, «مجدولة» in full', async () => {
  await renderWithQuery(<LessonStatusChip status="scheduled" size="sm" />, noConfirmQueryClient());
  expect(screen.getByText(t.lessons.noConfirm.scheduledShort)).toBeTruthy();
  await renderWithQuery(<LessonStatusChip status="scheduled" full />, noConfirmQueryClient());
  expect(screen.getByText(t.lessons.noConfirm.scheduled)).toBeTruthy();
  expect(screen.queryByText(t.enums.lessonStatus.scheduled)).toBeNull();
});

test('required: «للتأكيد» in a row and «يحتاج تأكيد» in full, as before', async () => {
  await renderWithQuery(<LessonStatusChip status="scheduled" />, confirmingQueryClient());
  expect(screen.getByText(t.today.statusShort.scheduled)).toBeTruthy();
  await renderWithQuery(<LessonStatusChip status="scheduled" full />, confirmingQueryClient());
  expect(screen.getByText(t.enums.lessonStatus.scheduled)).toBeTruthy();
});

test('other statuses keep their own word either way', async () => {
  await render(<LessonStatusChip status="completed" />);
  expect(screen.getByText(t.enums.lessonStatus.completed)).toBeTruthy();
});
