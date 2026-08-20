import { ModuleLayout, Skeleton } from '@carbonnt-cyacle/web-base'

export function AppRoutePendingFallback() {
  return (
    <ModuleLayout
      className="flex h-full min-h-[320px] w-full min-w-0 flex-1 overflow-hidden px-3 py-3 sm:px-4 sm:py-4"
    >
      <div
        data-slot="app-route-pending-fallback"
        className="mx-auto flex h-full min-h-0 w-full max-w-screen-2xl flex-1 flex-col gap-4 overflow-hidden"
      >
        <div className="flex shrink-0 items-start justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-64 max-w-[70vw]" />
          </div>
          <Skeleton className="h-9 w-24 shrink-0" />
        </div>
        <Skeleton className="h-9 w-full shrink-0 sm:max-w-md" />
        <div className="min-h-0 flex-1 space-y-3 overflow-hidden rounded-lg border bg-card p-4">
          <Skeleton className="h-5 w-1/3" />
          {Array.from({ length: 6 }).map((_, rowIndex) => (
            <Skeleton key={rowIndex} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </ModuleLayout>
  )
}
