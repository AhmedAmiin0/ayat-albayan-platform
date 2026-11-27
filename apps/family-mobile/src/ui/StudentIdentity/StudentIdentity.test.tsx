import { render, screen } from '@testing-library/react-native';
import { AppText } from '@ab/mobile-kit';
import { student } from '@/portal/portal.fixtures';
import { StudentIdentity } from './StudentIdentity';

const kid = student();

test("the student's name, code and the line under it", async () => {
  await render(
    <StudentIdentity student={kid}>
      <AppText>آخر تقرير</AppText>
    </StudentIdentity>,
  );
  expect(screen.getByText(kid.name)).toBeTruthy();
  expect(screen.getByText(new RegExp(kid.code))).toBeTruthy();
  expect(screen.getByText('آخر تقرير')).toBeTruthy();
});

test('a given name replaces the student’s own', async () => {
  await render(<StudentIdentity student={kid} name="أنا" />);
  expect(screen.getByText('أنا')).toBeTruthy();
  expect(screen.queryByText(kid.name)).toBeNull();
});
