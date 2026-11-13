import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { TeacherMe } from '@ab/shared';
import { TeacherBoard } from './TeacherBoard';
import { ME, MISSED, NEXT, NOW, PAST } from './board-fixture-data';

// Test helper (not a test): renders the board over board-fixture-data.ts.

export { FACTS, kid, ME, MISSED, NEXT, when } from './board-fixture-data';

export function renderBoard(me: TeacherMe = ME) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <TeacherBoard me={me} lessons={[PAST, MISSED, NEXT]} now={NOW} />
    </QueryClientProvider>,
  );
}

export const rowOf = (name: string) => {
  const row = screen.getByRole('link', { name }).closest('tr');
  if (!row) throw new Error(`no row for ${name}`);
  return row;
};
