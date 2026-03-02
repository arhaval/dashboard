/**
 * Reports Loading Skeleton
 */

export default function ReportsLoading() {
  return (
    <div className="animate-pulse p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="h-8 w-28 rounded bg-[var(--color-bg-secondary)]" />
          <div className="mt-2 h-4 w-56 rounded bg-[var(--color-bg-secondary)]" />
        </div>
        <div className="h-10 w-36 rounded-[var(--radius-sm)] bg-[var(--color-bg-secondary)]" />
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
          />
        ))}
      </div>

      {/* Platform table */}
      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)]">
        <div className="h-12 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-14 border-b border-[var(--color-border)] last:border-b-0"
          />
        ))}
      </div>

      {/* Insights */}
      <div className="mt-6 h-32 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)]" />
    </div>
  );
}
