/**
 * Work Items Loading Skeleton
 */

export default function WorkItemsLoading() {
  return (
    <div className="animate-pulse p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="h-8 w-32 rounded bg-[var(--color-bg-secondary)]" />
          <div className="mt-2 h-4 w-64 rounded bg-[var(--color-bg-secondary)]" />
        </div>
        <div className="h-10 w-24 rounded-[var(--radius-sm)] bg-[var(--color-bg-secondary)]" />
      </div>

      {/* Stats cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-20 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
          />
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-10 w-36 rounded-[var(--radius-sm)] bg-[var(--color-bg-secondary)]" />
        ))}
      </div>

      {/* Table */}
      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)]">
        <div className="h-12 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-14 border-b border-[var(--color-border)] last:border-b-0"
          />
        ))}
      </div>
    </div>
  );
}
