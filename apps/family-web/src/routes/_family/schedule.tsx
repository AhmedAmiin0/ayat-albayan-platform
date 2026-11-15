import { createFileRoute } from '@tanstack/react-router';
import { SchedulePage } from '@/features/schedule';
import { WithHome } from '@/features/shell';

export const Route = createFileRoute('/_family/schedule')({
  component: () => <WithHome>{(home) => <SchedulePage home={home} />}</WithHome>,
});
