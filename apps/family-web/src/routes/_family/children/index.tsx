import { createFileRoute } from '@tanstack/react-router';
import { PickChildPage } from '#/features/children/index.ts';
import { requirePicker, WithHome } from '#/features/shell/index.ts';

/** «اختر الطالب»: a guardian of several children switches the child the pages work as. */
export const Route = createFileRoute('/_family/children/')({
  beforeLoad: ({ context }) => requirePicker(context),
  component: () => <WithHome>{(home) => <PickChildPage home={home} />}</WithHome>,
});
