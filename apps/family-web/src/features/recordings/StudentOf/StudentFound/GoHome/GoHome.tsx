import { Link } from '@tanstack/react-router';
import { buttonVariants, t } from '@ab/web-kit';

export function GoHome() {
  return (
    <Link to="/portal" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
      {t.familyWeb.routeError.home}
    </Link>
  );
}
