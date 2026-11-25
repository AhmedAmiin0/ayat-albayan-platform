import { Button, t } from '@ab/web-kit';

const G = t.shortLinks.gate;

export function SignOutLine({ onSignOut }: { onSignOut: () => Promise<void> }) {
  return (
    <p className="flex items-center justify-center gap-1 text-[14px] text-ink-2">
      {G.notYou}
      <Button type="button" variant="ghost" size="sm" className="text-[14px]"
        onClick={() => void onSignOut()}>
        {G.signOut}
      </Button>
    </p>
  );
}
