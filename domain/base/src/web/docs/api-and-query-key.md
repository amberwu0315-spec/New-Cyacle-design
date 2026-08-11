# 接口调用与 QueryKey

[← 返回 Web 文档入口](../web.md)

> 职责：规定 feature-local API hook、RPC 方法身份、QueryKey 结构和缓存失效方式。

业务 API 推荐放 feature-local `queries.ts` 中，使用 React Query 管 server state。页面只消费 hook 结果和触发 mutation，不直接拼 RPC 请求。

## QueryKey 取值

`queryKey` / `mutationKey` 的前两段固定取 RPC 方法身份：`[serviceName, methodName]`。skel 生成的 TypeScript 包会从 `spec.ts` 导出 `XxxServiceSpec`，其中包含 `serviceName` 和 `methods`；generated `service.ts` 也使用同一个 `Spec.serviceName` / `Spec.methods.xxx` 调用 RPC。绝大多数 query key 直接 import 对应的 `XxxServiceSpec`，不要在业务代码里重复手写 `{ serviceName: '...', methodName: '...' }`，避免接口改名后 key 和 generated service 漂移。

```ts
// domain/catalog/src/web/src/features/reports/queries.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { vrpcClient } from '@example-app/web-base'
import {
  CatalogReportServiceSpec,
  createCatalogReportService,
} from '@example-app/skeled-catalog'

const catalogReportService = createCatalogReportService(vrpcClient)

type ReportFilters = {
  status?: string
}

function normalizeReportFilters(filters: ReportFilters) {
  return {
    status: filters.status ?? 'all',
  }
}

export const catalogReportKeys = {
  listRoot: () => [
    CatalogReportServiceSpec.serviceName,
    CatalogReportServiceSpec.methods.list,
  ] as const,
  list: (filters: ReportFilters) => [
    ...catalogReportKeys.listRoot(),
    normalizeReportFilters(filters),
  ] as const,
  detail: (id: string) => [
    CatalogReportServiceSpec.serviceName,
    CatalogReportServiceSpec.methods.get,
    id,
  ] as const,
}

export function useCatalogReports(filters: ReportFilters) {
  return useQuery({
    queryKey: catalogReportKeys.list(filters),
    queryFn: () => catalogReportService.list(filters),
  })
}

export function useCatalogReport(id: string) {
  return useQuery({
    queryKey: catalogReportKeys.detail(id),
    queryFn: () => catalogReportService.get({ id }),
  })
}

export function useArchiveCatalogReport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: [
      CatalogReportServiceSpec.serviceName,
      CatalogReportServiceSpec.methods.archive,
    ],
    mutationFn: (id: string) => catalogReportService.archive({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: catalogReportKeys.listRoot() })
    },
  })
}
```

取值规则：

- 前缀优先用 skel `spec.ts` 导出的 `XxxServiceSpec.serviceName` 和 `XxxServiceSpec.methods.xxx`，保证跨 domain 不冲突，并和 generated service 使用同一份方法身份。
- 不要为了 query key 在 `queries.ts` 里再手写 `const xxxMethod = { serviceName: '...', methodName: '...' }`；只有本地封装服务、非 skel RPC、历史手写 client 等没有 `Spec` 导出的场景才手写，并在常量旁说明来源。
- 方法后追加资源维度，例如 `id`、`workspaceId`、分页、筛选和排序；只追加可序列化且稳定的值，不放函数、组件实例、未规范化的 `Date` 或临时对象。
- 列表接口保留 `listRoot()` 这类不带筛选参数的 root key，用于新增、删除、归档后批量失效；具体列表查询再在 root 后追加规范化后的 filters。
- 详情接口用对应详情方法的 key 前缀加资源 id，不要复用列表方法的 key 前缀。
- 跨领域调用时 import 被调用包导出的真实 `Spec`，例如从 `@example-app/skeled-uicpub` 使用 `WorkspaceAppApiServiceSpec`；调用 pub service 时同样以 pub skel 包导出的 `Spec` 为准。

页面只消费 hook，不直接拼请求。

```tsx
// domain/catalog/src/web/src/features/reports/page.tsx
import { Button } from '@example-app/web-base/components/ui/button'

import { useArchiveCatalogReport, useCatalogReports } from '#/features/reports/queries.ts'

export function ReportsPage() {
  const reports = useCatalogReports({ status: 'active' })
  const archiveReport = useArchiveCatalogReport()

  if (reports.isLoading) return <div>Loading...</div>
  if (reports.isError) return <div>Failed to load reports.</div>

  return reports.data?.map((report) => (
    <Button
      key={report.id}
      disabled={archiveReport.isPending}
      onClick={() => archiveReport.mutate(report.id)}
    >
      Archive
    </Button>
  ))
}
```
