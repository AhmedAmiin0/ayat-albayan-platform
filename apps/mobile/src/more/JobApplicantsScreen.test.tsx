import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { ltr } from '@/ui/Ltr';
import { JobApplicantsScreen } from './JobApplicantsScreen';
import type { JobApplicant } from './types';

const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));

const page = (items: JobApplicant[]) => ({ items, total: items.length, page: 1, pageSize: 25 });

test('name, isolated LTR phone and the pipeline status; read-only rows', async () => {
  mockApiFetch.mockResolvedValue(
    page([
      { id: 'j1', name: 'أ. منى', phone_e164: '+201001234567', status: 'interview' },
      { id: 'j2', name: null, phone_e164: '+966552147730', status: 'new' },
    ]),
  );
  await renderWithQuery(<JobApplicantsScreen />);
  expect(await screen.findByText('أ. منى')).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/job-applicants?page=1&pageSize=25');
  expect(screen.getByText(ltr('+20 10 0123 4567'))).toBeTruthy();
  // No name yet: the phone is the title, still isolated so it reads left to right.
  expect(screen.getByText(ltr('+966 55 214 7730'))).toBeTruthy();
  expect(screen.getByText(t.enums.jobApplicantStatus.interview)).toBeTruthy();
  expect(screen.getByText(t.enums.jobApplicantStatus.new)).toBeTruthy();
  expect(screen.queryByRole('button')).toBeNull();
});

test('no applicants: the honest empty state', async () => {
  mockApiFetch.mockResolvedValue(page([]));
  await renderWithQuery(<JobApplicantsScreen />);
  expect(await screen.findByRole('header', { name: t.jobApplicants.empty })).toBeTruthy();
});

test('failed with nothing cached: error + retry', async () => {
  mockApiFetch.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(
    page([{ id: 'j1', name: 'أ. منى', phone_e164: '+201001234567', status: 'new' }]),
  );
  await renderWithQuery(<JobApplicantsScreen />);
  expect(await screen.findByText(t.common.error)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.mobile.retry }));
  expect(await screen.findByText('أ. منى')).toBeTruthy();
});
