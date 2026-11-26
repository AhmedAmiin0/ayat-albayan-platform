import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { PdfPage } from './PdfPage';
import { PdfViewer } from '../PdfViewer';

const page = { page: 2, pages: 5, onRetry: jest.fn(), onZoom: jest.fn() };
const label = t.inbox.pdf.pageOf.replace('{n}', '2').replace('{total}', '5');

test('a page with its URL: an image button that opens it full screen', async () => {
  const onZoom = jest.fn();
  await render(<PdfPage {...page} url="https://x/p2.png" failed={false} onZoom={onZoom} />);
  expect(screen.getByTestId('pdf-page-image-2')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText(label));
  expect(onZoom).toHaveBeenCalledWith({ uri: 'https://x/p2.png', label });
});

test('a page that failed says so; a tap asks again', async () => {
  const onRetry = jest.fn();
  await render(<PdfPage {...page} failed onRetry={onRetry} />);
  const button = screen.getByLabelText(t.inbox.pdf.pageFailed);
  expect(button.props.accessibilityRole).toBe('button');
  await fireEvent.press(button);
  expect(onRetry).toHaveBeenCalled();
});

test('the viewer: its meta line, the page in view, a page per number from the caller', async () => {
  const renderPage = jest.fn((n: number) => <Text>{`page ${n}`}</Text>);
  const onClose = jest.fn();
  await render(
    <PdfViewer name="a.pdf" meta="3 صفحات" pages={3} renderPage={renderPage} onClose={onClose} />,
  );
  expect(screen.getByText('3 صفحات')).toBeTruthy();
  expect(screen.getByTestId('pdf-current')).toHaveTextContent(
    t.inbox.pdf.pageOf.replace('{n}', '1').replace('{total}', '3'),
  );
  expect(screen.getByText('page 1')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText(t.common.close));
  expect(onClose).toHaveBeenCalled();
});
