import { createFileRoute } from '@tanstack/react-router';
import { PickChildPage } from '@/features/children';
import { requirePicker, WithHome } from '@/features/shell';

export const Route = createFileRoute('/_family/children/')({
  beforeLoad: ({ context }) => requirePicker(context),
  component: () => <WithHome>{(home) => <PickChildPage home={home} />}</WithHome>,
});
