import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { ApplicantLinks } from './ApplicantLinks';

afterEach(() => jest.restoreAllMocks());

test('docs/07 «الأزرار»: both links as one ButtonRow of outlined buttons with the open icon', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  await render(<ApplicantLinks cv="https://example.org/cv.pdf" recitation="https://example.org/r.mp3" />);
  expect(screen.getAllByTestId('button-row-cell')).toHaveLength(2);
  expect(screen.getAllByTestId('button-icon')).toHaveLength(2);
  await fireEvent.press(screen.getByRole('button', { name: t.mobileLeads.openCv }));
  expect(open).toHaveBeenCalledWith('https://example.org/cv.pdf');
});

test('one link: a single cell; none: nothing', async () => {
  await render(<ApplicantLinks cv={null} recitation="https://example.org/r.mp3" />);
  expect(screen.getAllByTestId('button-row-cell')).toHaveLength(1);
  await render(<ApplicantLinks cv={null} recitation={undefined} />);
  expect(screen.queryByRole('button')).toBeNull();
});
