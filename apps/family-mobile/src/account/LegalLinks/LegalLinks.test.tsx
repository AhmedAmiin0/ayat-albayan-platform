import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { t } from '@ab/mobile-kit';
import { LegalLinks } from './LegalLinks';

// Google Play requires both pages reachable inside the app, signed in or not.

const openURL = jest.spyOn(Linking, 'openURL');

beforeEach(() => openURL.mockReset().mockResolvedValue(true));

test('two rows, each named by its page and saying it opens in the browser', async () => {
  await render(<LegalLinks />);
  for (const name of [t.legal.links.privacy, t.legal.links.deleteAccount]) {
    const row = screen.getByRole('button', { name: new RegExp(name) });
    expect(row.props.accessibilityHint).toBe(t.legal.links.opensBrowser);
  }
});

test('«سياسة الخصوصية» opens https://family.ayatalbayan.com/privacy', async () => {
  await render(<LegalLinks />);
  await fireEvent.press(screen.getByRole('button', { name: new RegExp(t.legal.links.privacy) }));
  expect(openURL).toHaveBeenCalledWith('https://family.ayatalbayan.com/privacy');
});

test('«حذف الحساب وبياناته» opens https://family.ayatalbayan.com/delete-account', async () => {
  await render(<LegalLinks />);
  await fireEvent.press(screen.getByRole('button', { name: new RegExp(t.legal.links.deleteAccount) }));
  expect(openURL).toHaveBeenCalledWith('https://family.ayatalbayan.com/delete-account');
});

test('no browser (openURL rejects): nothing throws, the screen stays', async () => {
  openURL.mockRejectedValue(new Error('no browser'));
  await render(<LegalLinks />);
  await fireEvent.press(screen.getByRole('button', { name: new RegExp(t.legal.links.privacy) }));
  await Promise.resolve();
  expect(screen.getByRole('button', { name: new RegExp(t.legal.links.deleteAccount) })).toBeTruthy();
});
