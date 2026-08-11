# Feature 组织

[← 返回 Web 文档入口](../web.md)

> 职责：规定非平凡页面、编排 hook、focused hook、组件与 dialog 的目录和组合方式。

非平凡页面的 `page.tsx` 只做组合，功能代码留在同 feature 子文件中。`useXxxPage()` 作为页面编排 hook，组合 server state hook、focused hook 和页面级 logic；dialog、schema、复杂计算和私有组件拆到对应目录。

```text
features/home/
├── page.tsx
├── queries.ts
├── components/
│   ├── home-error-state.tsx
│   ├── home-overview.tsx
│   └── home-page-skeleton.tsx
├── dialogs/
│   └── create-task-dialog.tsx
└── hooks/
    ├── use-home-page.ts
    └── use-home-task-filters.ts
```

```tsx
// domain/catalog/src/web/src/features/home/page.tsx
import { HomeErrorState } from '#/features/home/components/home-error-state.tsx'
import { HomeOverview } from '#/features/home/components/home-overview.tsx'
import { HomePageSkeleton } from '#/features/home/components/home-page-skeleton.tsx'
import { CreateTaskDialog } from '#/features/home/dialogs/create-task-dialog.tsx'
import { useHomePage } from '#/features/home/hooks/use-home-page.ts'

export function HomePage() {
  const page = useHomePage()

  if (page.overview.isLoading) return <HomePageSkeleton />
  if (page.overview.isError) return <HomeErrorState onRetry={page.retryOverview} />

  return (
    <>
      <HomeOverview
        filters={page.filters}
        metrics={page.overview.data.metrics}
        tasks={page.visibleTasks}
      />
      <CreateTaskDialog projectId={page.overview.data.projectId} />
    </>
  )
}
```

```ts
// domain/catalog/src/web/src/features/home/hooks/use-home-page.ts
import { useMemo } from 'react'

import { useHomeTaskFilters } from '#/features/home/hooks/use-home-task-filters.ts'
import { useHomeOverview } from '#/features/home/queries.ts'

export function useHomePage() {
  const overview = useHomeOverview()
  const filters = useHomeTaskFilters()

  const visibleTasks = useMemo(() => {
    const tasks = overview.data?.tasks ?? []

    if (filters.status === 'all') return tasks
    return tasks.filter((task) => task.status === filters.status)
  }, [filters.status, overview.data?.tasks])

  return {
    filters,
    overview,
    retryOverview: overview.refetch,
    visibleTasks,
  }
}
```

Focused hooks 按关注点拆分，默认放 `hooks/`。

```ts
// domain/catalog/src/web/src/features/home/hooks/use-home-task-filters.ts
import { useMemo, useState } from 'react'

type TaskStatus = 'all' | 'open' | 'done'

export function useHomeTaskFilters() {
  const [status, setStatus] = useState<TaskStatus>('all')
  const activeFilterCount = useMemo(() => (status === 'all' ? 0 : 1), [status])

  return { activeFilterCount, setStatus, status }
}
```

仅本领域复用的组合组件可以放 domain-local `components/`；feature 私有组件留在 `features/<feature>/components/`。

```tsx
// domain/catalog/src/web/src/components/catalog-status-badge.tsx
import { Badge } from '@example-app/web-base/components/ui/badge'

type CatalogStatusBadgeProps = {
  status: 'active' | 'archived'
}

export function CatalogStatusBadge({ status }: CatalogStatusBadgeProps) {
  return <Badge variant={status === 'active' ? 'default' : 'secondary'}>{status}</Badge>
}
```

Dialog 组件放 `dialogs/`，只暴露页面需要的 props，不把弹窗内部状态摊到 `page.tsx`。

```tsx
// domain/catalog/src/web/src/features/home/dialogs/create-task-dialog.tsx
import { Button } from '@example-app/web-base/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@example-app/web-base/components/ui/dialog'

import { useCreateTask } from '#/features/home/queries.ts'

export function CreateTaskDialog({ projectId }: { projectId: string }) {
  const createTask = useCreateTask(projectId)

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>New task</Button>
      </DialogTrigger>
      <DialogContent>
        <Button disabled={createTask.isPending}>Create</Button>
      </DialogContent>
    </Dialog>
  )
}
```
