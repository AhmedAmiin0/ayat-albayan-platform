import { PDF_PREVIEW_PAGES } from '@ab/shared';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import type { PdfZoom } from '../PdfPage';
import { PdfViewer } from './PdfViewer';

const more = t.inbox.pdf.more.replace('{n}', String(PDF_PREVIEW_PAGES));
const zoomable = (n: number, onZoom: (shown: PdfZoom) => void) => (
  <Pressable
    accessibilityRole="button"
    onPress={() => onZoom({ uri: `https://x/p${n}.png`, label: `zoom ${n}` })}
  >
    <Text>{`page ${n}`}</Text>
  </Pressable>
);

test('a pdf within the preview has no «more» line', async () => {
  await render(
    <PdfViewer name="a.pdf" meta="m" pages={3} renderPage={zoomable} onClose={jest.fn()} />,
  );
  expect(screen.queryByText(more)).toBeNull();
});

test('a pdf past the preview says only the first pages show', async () => {
  const pages = PDF_PREVIEW_PAGES + 1;
  await render(
    <PdfViewer name="a.pdf" meta="m" pages={pages} renderPage={zoomable} onClose={jest.fn()} />,
  );
  expect(screen.getByTestId('pdf-current')).toHaveTextContent(
    t.inbox.pdf.pageOf.replace('{n}', '1').replace('{total}', String(pages)),
  );
  expect(screen.getByText(t.inbox.pdf.zoomHint)).toBeTruthy();
  expect(screen.getByText(more)).toBeTruthy();
});

test('a tapped page opens full screen; closing it keeps the viewer', async () => {
  await render(
    <PdfViewer name="a.pdf" meta="m" pages={2} renderPage={zoomable} onClose={jest.fn()} />,
  );
  expect(screen.queryByTestId('photo-viewer')).toBeNull();
  await fireEvent.press(screen.getByText('page 1'));
  expect(screen.getByTestId('photo-viewer')).toBeTruthy();
  const photo = within(screen.getByTestId('photo-viewer'));
  await fireEvent.press(photo.getByLabelText(t.common.close));
  expect(screen.queryByTestId('photo-viewer')).toBeNull();
  expect(screen.getByTestId('pdf-viewer')).toBeTruthy();
});
