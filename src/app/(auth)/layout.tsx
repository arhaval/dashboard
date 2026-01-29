/**
 * Auth Layout
 * Layout for authentication pages (login)
 * Minimal layout without sidebar/header
 */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      {children}
    </div>
  );
}
