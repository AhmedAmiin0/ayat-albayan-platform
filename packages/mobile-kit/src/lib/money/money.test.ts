import { ltr } from '../../ui/primitives/Ltr';
import { t } from '../i18n/i18n';
import { currencyName, money } from './money';

test('the amount isolated, then the currency word or the isolated ISO code', () => {
  expect(money(145, 'SAR')).toBe(`${ltr('145')} ${t.pricing.currencies.SAR}`);
  expect(money(1061.5, 'USD')).toBe(`${ltr('1,061.5')} ${t.pricing.currencies.USD}`);
  expect(currencyName('EGP')).toBe(ltr('EGP'));
});
