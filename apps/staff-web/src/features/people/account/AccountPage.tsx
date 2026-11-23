import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { NuqtaGlyph } from '@ab/web-kit/components/ui/display/nuqta-glyph';
import { Skeleton } from '@ab/web-kit/components/ui/display/skeleton';
import { Toast } from '@ab/web-kit/components/ui/overlay/toast';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { AccountHead } from './AccountHead';
import { profileQuery } from './api';
import { AvatarSection } from './sections/AvatarSection';
import { EmailSection } from './sections/EmailSection';
import { NameSection } from './sections/NameSection';
import { PasswordSection } from './sections/PasswordSection';
import { PhoneSection } from './sections/PhoneSection';

function AccountSkeleton() {
  return (
    <div role="status" aria-busy="true" className="grid gap-6 pt-6">
      <span className="sr-only">{t.account.loading}</span>
      <span aria-hidden="true" className="flex items-center gap-6">
        <Skeleton className="size-24 shrink-0 rounded-full" />
        <span className="grid flex-1 gap-2">
          <Skeleton className="w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </span>
      </span>
      {[0, 1, 2].map((i) => (
        <span key={i} aria-hidden="true" className="grid gap-2 border-t border-rule pt-6">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-10 max-w-[34rem]" />
        </span>
      ))}
    </div>
  );
}

/** R-ACC-01..05: the name and number families see stay with the administration. */
export function AccountPage() {
  const profile = useQuery(profileQuery);
  const [toast, setToast] = useState<string | null>(null);
  const data = profile.data;
  return (
    <>
      <AccountHead profile={data} />
      {/* A note, not an alert: hollow nuqta, the sentence in ONE span (docs/07 §14.2). */}
      <p className="mt-4 flex max-w-[70ch] items-start gap-2 text-sm text-ink-2">
        <NuqtaGlyph shape="hollow" className="mt-1.5 text-ink-3" />
        <span className="text-pretty">{t.account.adminManagedHint}</span>
      </p>
      {profile.isPending && <AccountSkeleton />}
      {profile.isError && (
        <div className="mt-6 grid max-w-[34rem] justify-items-start gap-3">
          <FormAlert>{t.account.loadError}</FormAlert>
          <Button type="button" variant="secondary" disabled={profile.isFetching} onClick={() => void profile.refetch()}>
            {t.account.retry}
          </Button>
        </div>
      )}
      {data && (
        <div className="mt-4">
          <AvatarSection profile={data} onDone={setToast} />
          <NameSection key={`n-${data.full_name}`} profile={data} onDone={setToast} />
          <PhoneSection key={`p-${data.phone_e164 ?? ''}`} profile={data} onDone={setToast} />
          <EmailSection profile={data} onDone={setToast} />
          <PasswordSection onDone={setToast} />
        </div>
      )}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
