import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { t } from '../../../../lib/i18n/i18n';
import { Sheet } from '../Sheet';

const L = t.mobileRoom.leaveAsk;

function draw(open: boolean, onClose = jest.fn()) {
  return render(
    <Sheet open={open} onClose={onClose} testID="demo" label={L.title} title={L.title}>
      <Text>{L.body}</Text>
    </Sheet>,
  );
}

test('closed: nothing is presented', async () => {
  await draw(false);
  expect(screen.queryByTestId('demo')).toBeNull();
  expect(screen.queryByText(L.body)).toBeNull();
});

test('open: the title is a header above the body', async () => {
  await draw(true);
  expect(screen.getByRole('header', { name: L.title })).toBeTruthy();
  expect(screen.getByText(L.body)).toBeTruthy();
});

test('a drag down, the scrim or back (onDismiss) calls onClose once', async () => {
  const onClose = jest.fn();
  await draw(true, onClose);
  await fireEvent(screen.getByTestId('demo'), 'dismiss');
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('fit by default: no snap points, so the sheet takes its content height', async () => {
  await draw(true);
  expect(screen.getByTestId('demo').props.snapPoints).toBeUndefined();
});

test('large: drags between half and full', async () => {
  await render(
    <Sheet open size="large" onClose={jest.fn()} testID="demo" label={L.title}>
      <Text>{L.body}</Text>
    </Sheet>,
  );
  expect(screen.getByTestId('demo').props.snapPoints).toEqual(['half', 'full']);
});

test('no title: no header is drawn', async () => {
  await render(
    <Sheet open onClose={jest.fn()} testID="demo" label={L.title}>
      <Text>{L.body}</Text>
    </Sheet>,
  );
  expect(screen.queryByRole('header')).toBeNull();
  expect(screen.getByLabelText(L.title)).toBeTruthy();
});

test('scroll: the body sits in a scroll view that only grows to its content', async () => {
  await render(
    <Sheet open scroll onClose={jest.fn()} testID="demo" label={L.title}>
      <Text>{L.body}</Text>
    </Sheet>,
  );
  expect(screen.getByTestId('demo-scroll').props.style).toEqual({ flexGrow: 0 });
});
