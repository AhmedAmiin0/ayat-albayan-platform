import { createFileRoute } from '@tanstack/react-router';
import { AlertsPage } from '@/features/alerts';
import { WithHome } from '@/features/shell';

export const Route = createFileRoute('/_family/alerts')({
  component: () => <WithHome>{(home) => <AlertsPage kind={home.kind} />}</WithHome>,
});
