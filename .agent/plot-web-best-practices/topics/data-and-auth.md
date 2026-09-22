# Plot Web Data 与 Auth

## vRPC 与 React Query

Query/mutation 放 feature-local `queries.ts`。Base 通过 `getVrpcClient()`、`getQueryClient()` 延迟创建共享 client；getter 外不重复注册 middleware，根 barrel import 不产生实例化副作用。

### 项目参考模板：Query Keys

方法名和调用签名必须来自目标项目 generated spec/client。

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getVrpcClient } from "@scope/web-base"
import {
  CatalogReportServiceSpec,
  createCatalogReportService,
} from "@scope/skeled-catalog"

const service = createCatalogReportService(getVrpcClient())

export const reportKeys = {
  listRoot: () => [
    CatalogReportServiceSpec.serviceName,
    CatalogReportServiceSpec.methods.list,
  ] as const,
  list: (status: string) => [...reportKeys.listRoot(), { status }] as const,
  detail: (id: string) => [
    CatalogReportServiceSpec.serviceName,
    CatalogReportServiceSpec.methods.get,
    id,
  ] as const,
}

export function useReports(status: string) {
  return useQuery({
    queryKey: reportKeys.list(status),
    queryFn: () => service.list({ status }),
  })
}

export function useArchiveReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: [
      CatalogReportServiceSpec.serviceName,
      CatalogReportServiceSpec.methods.archive,
    ],
    mutationFn: (id: string) => service.archive({ id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reportKeys.listRoot() }),
  })
}
```

Query key 规则：

```text
前两段  generated ServiceSpec.serviceName + methods.xxx
后续    稳定、可序列化、规范化的 id/filter/page/sort
listRoot 不带 filters，供新增/删除/归档批量失效
detail   使用 detail method + id，不复用 list key
```

没有 ServiceSpec 的本地 service 才手写 identity 并注明来源。Mutation 只失效受影响的 root/detail，不全局清 QueryClient。

## Auth（仅在项目有认证合同时启用）

```text
credential store
→ 唯一 vRPC header 注入点
→ protected profile query（登录态权威）
→ route auth/permission guard
→ login/logout 与账号敏感缓存生命周期
```

认证实现必须先确认：凭据介质、header/cookie 合同、profile method、Unauthorized 错误类型、权限字段和公开路由。示例不能替代这些事实。

### 必须保持的边界

- Client 每次请求动态读取 credential；不能在 singleton 创建时捕获 token。
- 本地 credential 只表示“可能有 session”；profile RPC 成功才是登录态权威。
- Token 是 opaque 值，不从内容推断 account、role 或 permission。
- Guard 挂在覆盖受保护页面组的最近公共父 route；login/callback 挂 `root`。
- 回跳只接受同源站内绝对 path，拒绝 scheme、`//`、反斜杠、控制字符和 login 自身。
- Logout 无论服务端成功或失败都清本地 credential、profile 和账号敏感缓存。
- 前端 guard/隐藏导航不能替代服务端授权。

### 项目参考模板：Profile Guard

Helper 名称和错误判断必须替换为目标项目实现。

```ts
export async function requireAuthProfile(location: { href: string }) {
  if (!hasSessionCredential()) redirectToLogin(location)

  try {
    return await getQueryClient().ensureQueryData(currentProfileQueryOptions())
  } catch (error) {
    if (isUnauthorizedError(error)) {
      clearSessionCredential()
      getQueryClient().removeQueries({ queryKey: profileKeys.current() })
      redirectToLogin(location)
    }
    throw error
  }
}
```

网络错误与 Unauthorized 能区分时，不因短暂网络故障登出。不能区分时按项目安全合同集中 fail closed，并记录体验风险。

## DO / NOT

| DO | NOT |
| --- | --- |
| QueryKey 使用 generated Spec | 复制 service/method 字符串或把函数放入 key |
| Mutation 精确更新/失效相关缓存 | 全局清 QueryClient |
| Auth 使用真实 profile/error/permission 合同 | 从 token 内容或本地 state 推断身份权限 |
| Logout 清账号敏感状态 | 服务端 logout 失败时保留本地 session |
