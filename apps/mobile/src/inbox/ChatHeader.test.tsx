import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { ChatHeader } from './ChatHeader';

const LONG = 'عبد الرحمن بن محمد بن عبد الله آل سليمان الشهري';

test('one line: the name and the subtitle are each cut to one line, the name is the header', async () => {
  await render(<ChatHeader title={LONG} subtitle="عميل محتمل · ‎+966 55 214 7730‎" onBack={jest.fn()} />);
  const title = screen.getByRole('header', { name: LONG });
  expect(title.props.numberOfLines).toBe(1);
  expect(screen.getByTestId('chat-subtitle').props.numberOfLines).toBe(1);
});

test('«رجوع» is a labelled icon button with the chevron pointing to the inline-start; it goes back', async () => {
  const onBack = jest.fn();
  await render(<ChatHeader title="هدى سالم" onBack={onBack} />);
  const back = screen.getByRole('button', { name: t.common.back });
  expect(within(back).getByTestId('chevron-prev', { includeHiddenElements: true })).toBeTruthy();
  expect(screen.queryByText(t.common.back)).toBeNull(); // an icon, no text taking the room
  await fireEvent.press(back);
  expect(onBack).toHaveBeenCalledTimes(1);
});

test('no subtitle: no second line', async () => {
  await render(<ChatHeader title="هدى سالم" onBack={jest.fn()} />);
  expect(screen.queryByTestId('chat-subtitle')).toBeNull();
});
