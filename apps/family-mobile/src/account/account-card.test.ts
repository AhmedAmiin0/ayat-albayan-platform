import { student } from '#/portal/portal.fixtures.ts';
import { accountCard } from './account-card';

const profile = {
  id: 'u1',
  full_name: 'ولي الأمر',
  email: null,
  phone_e164: null,
  avatar_url: 'https://files.example/a.jpg',
  role: { base: null, key: null, name_ar: null, name_en: null },
};

test("a guardian: the login's name and photo, no student tone", () => {
  expect(accountCard(profile, null)).toMatchObject({
    name: 'ولي الأمر',
    photo: 'https://files.example/a.jpg',
    seed: null,
  });
});

test("a student before the profile loads: their own name and id's tone", () => {
  const own = student();
  expect(accountCard(undefined, own)).toMatchObject({ name: own.name, photo: null, seed: own.id });
});
