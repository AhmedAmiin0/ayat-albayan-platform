import { FX_ATTRIBUTION_URL } from '@ab/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { ltr } from '@/core/ui/primitives/Ltr';
import { erApiRate, pegRate } from './fixtures';
import { FxNote, fxNotice } from './FxNote';

const fx = t.pricing.fx;

test('fresh rate: «سعر الصرف بتاريخ» + the provider’s day, Western digits', () => {
  expect(fxNotice(erApiRate)).toBe(fx.rateDate.replace('{date}', ltr('2026-10-02')));
});

test('API down, older stored rate: the stale notice with that rate’s day', () => {
  expect(fxNotice({ ...erApiRate, ageHours: 30 })).toBe(
    fx.stale.replace('{date}', ltr('2026-10-02')),
  );
});

test('never stored: the 3.75 peg notice', () => {
  expect(fxNotice(pegRate)).toBe(fx.fallback);
});

test('the ExchangeRate-API attribution links to its site', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  await render(<FxNote fx={erApiRate} />);
  await fireEvent.press(screen.getByRole('link', { name: fx.attribution }));
  expect(open).toHaveBeenCalledWith(FX_ATTRIBUTION_URL);
});

test('the peg is not their rate: no attribution', async () => {
  await render(<FxNote fx={pegRate} />);
  expect(screen.getByText(fx.fallback)).toBeTruthy();
  expect(screen.queryByText(fx.attribution)).toBeNull();
});
