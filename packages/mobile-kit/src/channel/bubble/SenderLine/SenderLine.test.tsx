import { render, screen } from '@testing-library/react-native';
import { t } from '../../../lib/i18n/i18n';
import { SenderLine } from './SenderLine';

const word = t.studentChannel.roles.teacher;

test('reads the name and the role word as one line', async () => {
  await render(<SenderLine name="هدى" role="teacher" />);
  expect(screen.getByLabelText(`هدى · ${word}`)).toBeTruthy();
  expect(screen.getByText('هدى')).toBeTruthy();
});

test('with no name, only the role word', async () => {
  await render(<SenderLine name="" role="teacher" />);
  expect(screen.getByLabelText(word)).toBeTruthy();
  expect(screen.queryByText('هدى')).toBeNull();
});
