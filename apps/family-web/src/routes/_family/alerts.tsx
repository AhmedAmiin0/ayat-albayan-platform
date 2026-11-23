import { createFileRoute } from '@tanstack/react-router';
import { AlertsPage } from '#/features/alerts/index.ts';
import { WithHome } from '#/features/shell/index.ts';

export const Route = createFileRoute('/_family/alerts')({
  component: () => <WithHome>{(home) => <AlertsPage kind={home.kind} />}</WithHome>,
});
