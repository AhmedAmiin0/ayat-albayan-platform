import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { confirmingQueryClient, renderWithQuery } from '@/test/query';
import { TodayScreen } from '@/today/screens/TodayScreen';
import { yusuf } from './fixtures';

// At 16:20 Riyadh in the tests the 16:00 lesson runs and is the hero.

const { openLesson } = t.today;
const timeToNames = openLesson.slice('{time}'.length, openLesson.indexOf('{names}'));

/** An academy that requires lesson confirmation (the Today flows predate the OFF default). */
export async function openToday(client = confirmingQueryClient()) {
  await renderWithQuery(<TodayScreen />, client);
  await screen.findByText(yusuf.name);
}

export async function openSheet(names?: string) {
  const target = names
    ? screen.getByRole('button', { name: new RegExp(`^\\d\\d:\\d\\d${timeToNames}${names}`) })
    : screen.getByRole('button', { name: t.today.details });
  await fireEvent.press(target);
  await screen.findByRole('header', { name: names ?? yusuf.name });
}

export const inSheet = (label: string, who = yusuf.name) => ({ name: `${label} — ${who}` });
