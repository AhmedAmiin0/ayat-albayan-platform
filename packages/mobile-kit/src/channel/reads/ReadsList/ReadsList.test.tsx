import { render, screen } from '@testing-library/react-native';
import { t } from '../../../lib/i18n/i18n';
import { ReadsList } from './ReadsList';

test('the title is a header, and an empty list says nobody', async () => {
  await render(<ReadsList title="read" rows={[]} />);
  expect(screen.getByRole('header', { name: 'read' })).toBeTruthy();
  expect(screen.getByText(t.studentChannel.reads.none)).toBeTruthy();
});

test('each row shows its line, and its time only when there is one', async () => {
  const rows = [
    { key: 'a', line: 'Abrar · teacher', time: '10:05' },
    { key: 'b', line: 'Mona · guardian', time: '' },
  ];
  await render(<ReadsList title="read" rows={rows} />);
  expect(screen.getByText('Abrar · teacher')).toBeTruthy();
  expect(screen.getByText('Mona · guardian')).toBeTruthy();
  expect(screen.getByText('10:05')).toBeTruthy();
  expect(screen.queryByText(t.studentChannel.reads.none)).toBeNull();
});
