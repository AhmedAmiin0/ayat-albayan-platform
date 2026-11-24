import { createFileRoute } from '@tanstack/react-router';
import { PackagePage } from '@/features/children';
import { WithHome } from '@/features/shell';

/** A guardian's or an adult's only. */
export const Route = createFileRoute('/_family/package/$studentId')({
  component: Package,
});

function Package() {
  const { studentId } = Route.useParams();
  return <WithHome>{(home) => <PackagePage home={home} studentId={studentId} />}</WithHome>;
}
