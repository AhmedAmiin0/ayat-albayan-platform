import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { ltr } from '@/ui/Ltr';
import { bulkSa, starterUsd } from './fixtures';
import { PricingScreen } from './PricingScreen';

const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));

const p = t.pricing;
const lastPath = (): string => String(mockApiFetch.mock.calls.at(-1)?.[0]);

beforeEach(() => mockApiFetch.mockReset());

test('opens on SA / 45 / standard and asks the API, never computing a price', async () => {
  mockApiFetch.mockResolvedValue(bulkSa);
  await renderWithQuery(<PricingScreen />);
  expect(screen.getByRole('header', { name: p.title })).toBeTruthy();
  expect(await screen.findByText(p.packages.bulk.name)).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith(
    '/pricing/quote?tier=standard&duration=45&country=SA&students=1&discount=0',
  );
  expect(screen.getByRole('radio', { name: p.countries.SA, checked: true })).toBeTruthy();
  expect(screen.getByRole('radio', { name: p.durations['45'], checked: true })).toBeTruthy();
  expect(screen.getByRole('radio', { name: p.frequencies.standard, checked: true })).toBeTruthy();
});

test('the card shows the API’s numbers: price, per lesson, total, discount, savings', async () => {
  mockApiFetch.mockResolvedValue(bulkSa);
  await renderWithQuery(<PricingScreen />);
  const sar = p.currencies.SAR;
  expect(await screen.findByText(`${ltr('385')} ${sar}`)).toBeTruthy();
  expect(screen.getByText(`${p.packagePrice} ${p.perStudent}`)).toBeTruthy();
  expect(screen.getByText(`${ltr('12.38')} ${sar}`)).toBeTruthy();
  expect(screen.getByText(`${ltr('770')} ${sar}`)).toBeTruthy();
  expect(screen.getByText(ltr('10%'))).toBeTruthy();
  expect(screen.getByText(`${ltr('693')} ${sar}`)).toBeTruthy();
  expect(
    screen.getByText(`${p.saveLabel} ${ltr('8%')} · ${p.insteadOf} ${ltr('420')} ${sar}`),
  ).toBeTruthy();
  expect(
    screen.getByText(`${p.packages.bulk.sessions} - ${p.durations['45']} ${p.perCircle}`),
  ).toBeTruthy();
  expect(screen.getByText(p.trialNote)).toBeTruthy();
  expect(screen.queryByText(p.fx.attribution)).toBeNull();
});

test('«دولة تانية (بالدولار)» drops the country; the USD card carries the rate’s date', async () => {
  mockApiFetch.mockImplementation(async (path: string) =>
    path.includes('country=') ? bulkSa : starterUsd,
  );
  await renderWithQuery(<PricingScreen />);
  await screen.findByText(p.packages.bulk.name);
  await fireEvent.press(screen.getByRole('radio', { name: p.otherCountry }));
  expect(await screen.findByText(p.packages.starter.name)).toBeTruthy();
  // One student, no discount: the price and the total are both $32; $4 a lesson.
  expect(screen.getAllByText(`${ltr('32')} ${p.currencies.USD}`)).toHaveLength(2);
  expect(screen.getByText(`${ltr('4')} ${p.currencies.USD}`)).toBeTruthy();
  expect(lastPath()).not.toContain('country');
  expect(screen.getByText(p.fx.rateDate.replace('{date}', ltr('2026-10-02')))).toBeTruthy();
  expect(screen.getByRole('link', { name: p.fx.attribution })).toBeTruthy();
});

test('«عدد مخصوص» asks by count, and steps the count', async () => {
  mockApiFetch.mockResolvedValue(bulkSa);
  await renderWithQuery(<PricingScreen />);
  await screen.findByText(p.packages.bulk.name);
  await fireEvent.press(screen.getByRole('radio', { name: p.customLabel }));
  expect(lastPath()).toBe('/pricing/quote?count=10&duration=45&country=SA&students=1&discount=0');
  // Two steppers now: the lesson count comes before the students.
  const [countMore] = screen.getAllByRole('button', { name: p.increase });
  if (!countMore) throw new Error('no count stepper');
  await fireEvent.press(countMore);
  expect(lastPath()).toContain('count=11');
});

test('weekly: duration is fixed at 90, students and discount go to the API', async () => {
  mockApiFetch.mockResolvedValue(bulkSa);
  await renderWithQuery(<PricingScreen />);
  await screen.findByText(p.packages.bulk.name);
  await fireEvent.press(screen.getByRole('radio', { name: p.frequencies.weekly }));
  expect(screen.getByText(p.fixedDuration)).toBeTruthy();
  expect(screen.queryByRole('radio', { name: p.durations['45'] })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: p.increase }));
  await fireEvent.press(screen.getByRole('radio', { name: p.discounts['15'] }));
  expect(lastPath()).toBe(
    '/pricing/quote?tier=weekly&duration=45&country=SA&students=2&discount=15',
  );
});

test('the free discount field sends any 0–100, as the site allows', async () => {
  mockApiFetch.mockResolvedValue(bulkSa);
  await renderWithQuery(<PricingScreen />);
  await screen.findByText(p.packages.bulk.name);
  // The pills share the step's name; the free field is the one holding the default «0».
  await fireEvent.changeText(screen.getByDisplayValue('0'), '12.5');
  expect(lastPath()).toBe(
    '/pricing/quote?tier=standard&duration=45&country=SA&students=1&discount=12.5',
  );
});

test('failed with nothing cached: error + retry', async () => {
  mockApiFetch.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(bulkSa);
  await renderWithQuery(<PricingScreen />);
  expect(await screen.findByText(t.common.error)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.mobile.retry }));
  expect(await screen.findByText(p.packages.bulk.name)).toBeTruthy();
});
