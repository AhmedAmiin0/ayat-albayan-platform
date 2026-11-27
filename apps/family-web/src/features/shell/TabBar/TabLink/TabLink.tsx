import { Link } from '@tanstack/react-router';
import { Icon, t, followSelected } from '@ab/web-kit';
import { TAB_ICON, TAB_PATH } from '@/features/shell/tab-links';
import type { TabLinkProps } from './TabLink.types';
import { ITEM } from './tab-link.helpers';

export function TabLink({ tab, current }: TabLinkProps) {
  return (
    <Link
      to={TAB_PATH[tab]}
      ref={current ? followSelected : undefined}
      aria-current={current ? 'page' : undefined}
      activeProps={{}}
      className={ITEM}
    >
      <Icon name={TAB_ICON[tab]} className="size-5 group-aria-[current=page]:text-lapis" />
      <span>{t.portal.app.tabs[tab]}</span>
    </Link>
  );
}
