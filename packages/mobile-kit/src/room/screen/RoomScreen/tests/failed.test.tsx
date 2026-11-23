import { fireEvent, render, screen } from '@testing-library/react-native';
import {
  CREDS,
  fakePlatform,
  LESSON,
  withInsets,
  type FakePlatform,
} from '../../../state/room-test-kit';
import { ApiError } from '../../../../lib/http/api';
import { t } from '../../../../lib/i18n/i18n';
import { RoomScreen } from '../RoomScreen';

const R = t.mobileRoom;
let p: FakePlatform;
const fetchJoin = jest.fn(async () => CREDS);
const onExit = jest.fn();
const onBrowser = jest.fn();
const press = async (label: string) =>
  fireEvent.press(await screen.findByRole('button', { name: label }));

beforeEach(() => {
  jest.clearAllMocks();
  p = fakePlatform();
});

test('a refused join reads the API code; «حاول مرة أخرى» goes back to the preview', async () => {
  fetchJoin.mockRejectedValueOnce(new ApiError(409, { code: 'join_closed' }));
  await render(
    withInsets(
      <RoomScreen
        platform={p}
        target={LESSON}
        onExit={onExit}
        fetchJoin={fetchJoin}
        onBrowser={onBrowser}
      />,
    ),
  );
  await press(R.preview.join);
  expect(await screen.findByText(t.classroom.error.join_closed)).toBeTruthy();
  expect(p.client.disconnect).toHaveBeenCalled();
  await press(t.classroom.retry);
  expect(await screen.findByTestId('room-preview')).toBeTruthy();
});

test('a connect failure says so; «رجوع» closes the screen', async () => {
  p.client.connect.mockRejectedValueOnce(new Error('ws'));
  await render(
    withInsets(
      <RoomScreen
        platform={p}
        target={LESSON}
        onExit={onExit}
        fetchJoin={fetchJoin}
        onBrowser={onBrowser}
      />,
    ),
  );
  await press(R.preview.join);
  expect(await screen.findByText(t.classroom.error.connect_failed)).toBeTruthy();
  await press(R.back);
  expect(onExit).toHaveBeenCalled();
});
