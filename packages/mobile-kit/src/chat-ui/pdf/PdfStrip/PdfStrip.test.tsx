import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { PdfStrip } from './PdfStrip';

test('page 1 fills the strip: no badge, no line, no spinner', async () => {
  await render(
    <PdfStrip waiting={false} note={null}>
      <Text>page 1</Text>
    </PdfStrip>,
  );
  expect(screen.getByText('page 1')).toBeTruthy();
  expect(screen.queryByText(t.inbox.pdf.type)).toBeNull();
  expect(screen.queryByLabelText(t.common.loading)).toBeNull();
});

test('while page 1 is on its way a spinner shows', async () => {
  await render(<PdfStrip waiting note={null} />);
  expect(screen.getByLabelText(t.common.loading)).toBeTruthy();
});

test('an empty note shows the large badge alone', async () => {
  await render(<PdfStrip waiting={false} note="" />);
  expect(screen.getByText(t.inbox.pdf.type)).toBeTruthy();
});

test('a note shows the large badge and its line', async () => {
  await render(<PdfStrip waiting={false} note="12 صفحة" />);
  expect(screen.getByText(t.inbox.pdf.type)).toBeTruthy();
  expect(screen.getByText('12 صفحة')).toBeTruthy();
});
