import { Link } from '@tanstack/react-router';
import { buttonVariants, t } from '@ab/web-kit';

export function BackToChildren() {
  return (
    <Link to="/children" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
      {t.portal.allChildren}
    </Link>
  );
}
