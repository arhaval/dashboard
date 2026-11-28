'use client';

/** İçerik Motoru bölüm sekmeleri. */

import { LinkTabs } from '@/components/ui/link-tabs';

export function MotorTabs() {
  return (
    <LinkTabs
      className="mb-6"
      items={[
        { href: '/motor', label: 'Metinler', exact: true },
        { href: '/motor/dna', label: 'Arhaval DNA' },
        { href: '/motor/formatlar', label: 'Formatlar' },
        { href: '/motor/referanslar', label: 'Referanslar' },
        { href: '/motor/ogrenme', label: 'Öğrenme' },
      ]}
    />
  );
}
