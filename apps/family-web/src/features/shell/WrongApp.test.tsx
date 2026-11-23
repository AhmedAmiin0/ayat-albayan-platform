import { screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { t } from '@ab/web-kit/i18n';
import { renderAt } from '#/test/render-at.tsx';
import { WrongApp } from './WrongApp';

it('a staff login: the notice, the family sign-in, no staff link without its origin', async () => {
  renderAt(<WrongApp />);
  expect((await screen.findByRole('alert')).textContent).toContain(t.familyApp.wrongApp);
  const signIn = screen.getByRole('link', { name: t.familyWeb.familySignIn });
  expect(signIn.getAttribute('href')).toBe('/login');
  expect(screen.queryByRole('link', { name: t.familyWeb.toStaffApp })).toBeNull();
});
