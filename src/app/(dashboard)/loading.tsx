/**
 * Dashboard Loading State
 * Shows skeleton while dashboard pages load
 */

export default function DashboardLoading() {
  return (
    <div className="animate-pulse p-6">
      {/* Page header skeleton */}
      <div className="mb-6">
        <div className="h-8 w-48 rounded bg-[var(--color-bg-secondary)]" />
        <div className="mt-2 h-4 w-72 rounded bg-[var(--color-bg-secondary)]" />
      </div>

      {/* Stats cards skeleton */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
          />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)]">
        <div className="h-12 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-14 border-b border-[var(--color-border)] last:border-b-0"
          />
        ))}
      </div>
    </div>
  );
}
