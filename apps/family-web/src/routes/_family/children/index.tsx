import { createFileRoute } from '@tanstack/react-router';
import { ChildrenPage } from '@/features/children';
import { requireTab, WithHome } from '@/features/shell';

/** «أبنائي»: a guardian's tab only. */
export const Route = createFileRoute('/_family/children/')({
  beforeLoad: ({ context }) => requireTab(context, 'children'),
  component: () => <WithHome>{(home) => <ChildrenPage home={home} />}</WithHome>,
});
