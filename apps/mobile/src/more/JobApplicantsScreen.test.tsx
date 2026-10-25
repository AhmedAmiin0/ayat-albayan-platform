import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { ltr } from '@/core/ui/primitives/Ltr';
import { JobApplicantsScreen } from './JobApplicantsScreen';
import type { JobApplicant } from './types';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
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
  // Each status is a filter pill and the row's chip.
  expect(screen.getAllByText(t.enums.jobApplicantStatus.interview)).toHaveLength(2);
  expect(screen.getAllByText(t.enums.jobApplicantStatus.new)).toHaveLength(2);
  expect(screen.queryByRole('button')).toBeNull(); // read-only: no row action, no link without a URL
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

const withLinks: JobApplicant = {
  id: 'j1', name: 'أ. منى', phone_e164: '+201001234567', status: 'new',
  cv_url: 'https://drive.example/cv', recitation_url: 'https://drive.example/rec',
};
const lastPath = () => String(mockApiFetch.mock.calls[mockApiFetch.mock.calls.length - 1]?.[0]);

test('the CV and recitation links open outside the app', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  open.mockClear();
  mockApiFetch.mockResolvedValue(page([withLinks]));
  await renderWithQuery(<JobApplicantsScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: t.mobileLeads.openCv }));
  expect(open).toHaveBeenCalledWith('https://drive.example/cv');
  await fireEvent.press(screen.getByRole('button', { name: t.mobileLeads.openRecitation }));
  expect(open).toHaveBeenCalledWith('https://drive.example/rec');
});

test('a missing or non-web link shows no button; a link the OS refuses says so', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('no app'));
  open.mockClear();
  mockApiFetch.mockResolvedValue(
    page([withLinks, { ...withLinks, id: 'j2', name: 'أ. هدى', cv_url: 'javascript:alert(1)', recitation_url: null }]),
  );
  await renderWithQuery(<JobApplicantsScreen />);
  await screen.findByText('أ. هدى');
  expect(screen.getAllByRole('button', { name: t.mobileLeads.openCv })).toHaveLength(1);
  await fireEvent.press(screen.getByRole('button', { name: t.mobileLeads.openCv }));
  expect(await screen.findByText(t.mobileLeads.linkFailed)).toBeTruthy();
  expect(open).toHaveBeenCalledTimes(1);
});

test('the status pill and the order go to GET /job-applicants as the web sends them', async () => {
  mockApiFetch.mockResolvedValue(page([withLinks]));
  await renderWithQuery(<JobApplicantsScreen />);
  await screen.findByText('أ. منى');
  await fireEvent.press(screen.getByRole('tab', { name: t.enums.jobApplicantStatus.interview }));
  await waitFor(() => expect(lastPath()).toContain('status=interview'));
  await fireEvent.press(screen.getByRole('radio', { name: t.leads.sort.name }));
  await waitFor(() => expect(lastPath()).toContain('sort=name'));
  expect(lastPath()).toContain('status=interview');
});

test('a filter with no match says so instead of «no applicants»', async () => {
  mockApiFetch.mockResolvedValueOnce(page([withLinks])).mockResolvedValue(page([]));
  await renderWithQuery(<JobApplicantsScreen />);
  await screen.findByText('أ. منى');
  await fireEvent.press(screen.getByRole('tab', { name: t.enums.jobApplicantStatus.rejected }));
  expect(await screen.findByRole('header', { name: t.mobileLeads.noMatch })).toBeTruthy();
});
