import { buttonVariants, t } from '@ab/web-kit';

/** The new address must be added to the Home Screen for notifications (docs/51 §3). */
export function FamilyMoved({ url }: { url: string }) {
  const F = t.familyWeb.moved;
  return (
    <main className="grid min-h-screen place-items-center bg-page px-4">
      <section aria-labelledby="family-moved" className="grid max-w-[420px] gap-4 text-center">
        <h1 id="family-moved" className="text-h3 font-bold text-ink">
          {F.title}
        </h1>
        <p className="text-body text-pretty text-ink-2">{F.body}</p>
        <a href={url} className={buttonVariants({ size: 'lg' })}>
          {F.open}
        </a>
      </section>
    </main>
  );
}
