import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { PhotoViewer } from './PhotoViewer';

const view = (footer?: string) => (
  <PhotoViewer
    uri="file:///photo.jpg"
    label="photo: the lesson board"
    footer={footer === undefined ? undefined : <Text>{footer}</Text>}
    onClose={jest.fn()}
  />
);

test('shows the photo under its label, with its footer', async () => {
  await render(view('download'));
  expect(screen.getByTestId('photo-viewer')).toBeTruthy();
  const image = screen.getByRole('image', { name: 'photo: the lesson board' });
  expect(image.props.source).toEqual({ uri: 'file:///photo.jpg' });
  expect(screen.getByText('download')).toBeTruthy();
});

test('the close button and the back gesture both close it', async () => {
  const onClose = jest.fn();
  await render(<PhotoViewer uri="file:///p.jpg" label="photo" onClose={onClose} />);
  await fireEvent.press(screen.getByRole('button', { name: t.common.close }));
  await fireEvent(screen.getByTestId('photo-viewer'), 'requestClose');
  expect(onClose).toHaveBeenCalledTimes(2);
});

test('the photo area takes its laid-out size without losing the photo', async () => {
  await render(view());
  const image = screen.getByRole('image', { name: 'photo: the lesson board' });
  const layout = { width: 300, height: 500 };
  await fireEvent(image, 'layout', { nativeEvent: { layout } });
  expect(screen.getByRole('image', { name: 'photo: the lesson board' })).toBeTruthy();
});
