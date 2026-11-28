'use client';

import * as React from 'react';

/**
 * Service worker kaydı — SADECE production.
 *
 * Neden: sw.js `/_next/static/` dosyalarını önce-önbellek (cache-first) verir.
 * Production'da dosya adları her derlemede değiştiği için bu güvenli; dev'de
 * (localhost) ise CSS/JS adları sabit kalır ve service worker haftalar önceki
 * stili vermeye devam eder — yeni sınıflar hiç görünmez. Dev'de bu yüzden
 * kayıt yapmıyor, önceden kalmış kaydı ve önbellekleri temizliyoruz.
 */
export function ServiceWorkerRegister() {
  React.useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    if (process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .catch((err) => console.error('[SW] Registration failed:', err));
      return;
    }

    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => Promise.all(regs.map((r) => r.unregister())))
      .then(() => ('caches' in window ? caches.keys() : Promise.resolve([] as string[])))
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .catch(() => {});
  }, []);

  return null;
}
