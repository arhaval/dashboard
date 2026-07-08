import { redirect } from 'next/navigation';
import { PageShell } from '@/components/layout';
import { userService } from '@/services';
import { sponsorService } from '@/services/sponsor.service';
import { SponsorsGrid } from './sponsors-grid';

export const dynamic = 'force-dynamic';

export default async function SponsorluklarPage() {
  const user = await userService.getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'ADMIN') redirect('/');

  const sponsors = await sponsorService.getAll();
  const withLogos = await Promise.all(
    sponsors.map(async (s) => ({ ...s, logoUrl: await sponsorService.signedUrl(s.logo_path) }))
  );

  return (
    <PageShell title="Sponsorluklar" description="Sponsor anlaşmaları, sözleşmeler ve logo paketleri">
      <SponsorsGrid sponsors={withLogos} />
    </PageShell>
  );
}
