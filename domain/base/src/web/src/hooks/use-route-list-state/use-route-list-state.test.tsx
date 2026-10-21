// @vitest-environment jsdom
import { act, cleanup, render, waitFor } from "@testing-library/react"
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  defaultStringifySearch,
  retainSearchParams,
} from "@tanstack/react-router"
import { SearchOperator } from "@crew-ui/base"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { routeListStateSchema, type RouteListState } from "./schema"
import { useRouteListState } from "./use-route-list-state"

beforeEach(() => vi.spyOn(window, "scrollTo").mockImplementation(() => {}))
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const defaults: RouteListState = {
  conditions: [
    { id: "status", fieldKey: "status", operator: SearchOperator.EQUAL, value: "NORMAL" },
  ],
  pagination: { offset: 0, limit: 50 },
  sorting: { columnKey: "updatedAt", direction: "desc" },
}
const saved: RouteListState = {
  conditions: [
    { id: "name", fieldKey: "name", operator: SearchOperator.CONTAINS, value: "中文测试" },
    {
      id: "date",
      fieldKey: "createdAt",
      operator: SearchOperator.CONTAINS_IN,
      value: { from: "2026-01-01", to: "2026-12-31", includeStart: true, includeEnd: false },
    },
  ],
  pagination: { offset: 100, limit: 50 },
  sorting: { columnKey: "name", direction: "asc" },
}

function validateSearch(search: Record<string, unknown>) {
  return {
    workspace: typeof search.workspace === "string" ? search.workspace : undefined,
    records: routeListStateSchema.parse(search.records),
  }
}

async function setup(initialState?: unknown) {
  let state!: ReturnType<typeof useRouteListState>
  function ListPage() {
    state = useRouteListState("records", defaults)
    return <div>list</div>
  }
  const root = createRootRoute({ component: Outlet })
  const group = createRoute({
    getParentRoute: () => root,
    id: "lists",
    component: Outlet,
    validateSearch,
    search: {
      middlewares: [
        retainSearchParams<ReturnType<typeof validateSearch>>(["workspace", "records"]),
      ],
    },
  })
  const list = createRoute({ getParentRoute: () => group, path: "list", component: ListPage })
  const detail = createRoute({
    getParentRoute: () => group,
    path: "detail",
    component: () => <div>detail</div>,
  })
  const history = createMemoryHistory({
    initialEntries: [
      "/list" + defaultStringifySearch({ workspace: "workspace-1", records: initialState }),
    ],
  })
  const router = createRouter({
    routeTree: root.addChildren([group.addChildren([list, detail])]),
    history,
    defaultPendingMinMs: 0,
  })
  render(<RouterProvider router={router} />)
  await waitFor(() => expect(state).toBeDefined())
  return {
    router,
    history,
    get state() {
      return state
    },
    get search() {
      return validateSearch(router.state.location.search)
    },
  }
}

describe("列表路由状态", () => {
  it("直连恢复中文、日期范围、分页和排序，初次挂载不重置页码", async () => {
    const page = await setup(saved)
    expect(page.state.conditions).toEqual(saved.conditions)
    expect(page.state.pagination).toEqual(saved.pagination)
    expect(page.state.sorting).toEqual(saved.sorting)
  })

  it("修改筛选写入 URL、重置页码并保留业务参数，不增加历史项", async () => {
    const page = await setup(saved)
    const length = page.history.length
    await act(async () => page.state.setConditions([]))
    await waitFor(() => expect(page.state.conditions).toEqual([]))
    expect(page.search.records?.conditions).toEqual([])
    expect(page.state.pagination).toEqual({ offset: 0, limit: 50 })
    expect(page.search.workspace).toBe("workspace-1")
    expect(page.history.length).toBe(length)
    // 显式清空默认状态筛选后，重新挂载也不能补回默认筛选。
    await act(async () => {
      await page.router.navigate({ to: "/detail" })
    })
    await act(async () => {
      await page.router.navigate({ to: "/list" })
    })
    expect(page.state.conditions).toEqual([])
  })

  it("进入详情、版本或返回列表的普通路由跳转保留列表现场", async () => {
    const page = await setup(saved)
    await act(async () => {
      await page.router.navigate({ to: "/detail" })
    })
    expect(page.search.records).toEqual(saved)
    await act(async () => {
      await page.router.navigate({ to: "/list" })
    })
    expect(page.state.pagination).toEqual(saved.pagination)
    expect(page.state.sorting).toEqual(saved.sorting)
    expect(page.state.conditions).toEqual(saved.conditions)
  })

  it("排序变化重置页码；分页操作不清空筛选和排序，默认状态从 URL 移除", async () => {
    const page = await setup(saved)
    await act(async () => page.state.setSorting(null))
    await waitFor(() => expect(page.state.sorting).toBeNull())
    expect(page.state.pagination.offset).toBe(0)
    await act(async () => page.state.setPagination({ offset: 20, limit: 20 }))
    await waitFor(() => expect(page.state.pagination).toEqual({ offset: 20, limit: 20 }))
    expect(page.state.conditions).toEqual(saved.conditions)
    await act(async () => page.state.setConditions(defaults.conditions))
    await act(async () => page.state.setPagination(defaults.pagination))
    await act(async () => page.state.setSorting(defaults.sorting))
    await waitFor(() => expect(page.search.records).toBeUndefined())
  })

  it("浏览器返回能恢复列表状态", async () => {
    const page = await setup(saved)
    await act(async () => {
      await page.router.navigate({ to: "/detail" })
    })
    await act(async () => page.history.back())
    await waitFor(() => expect(page.router.state.location.pathname).toBe("/list"))
    expect(page.state.pagination).toEqual(saved.pagination)
  })

  it.each([
    null,
    "invalid",
    { ...saved, pagination: { offset: -1, limit: 0 } },
    { ...saved, conditions: [{ id: "x", fieldKey: "name", operator: "invalid", value: "x" }] },
  ])("非法 URL 状态安全回退默认值：%j", async (value) => {
    const page = await setup(value)
    expect(page.state.conditions).toEqual(defaults.conditions)
    expect(page.state.pagination).toEqual(defaults.pagination)
  })
})
