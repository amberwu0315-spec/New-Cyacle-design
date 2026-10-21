import * as React from "react"
import { useLocation, useNavigate } from "@tanstack/react-router"

import { routeListStateSchema, type RouteListState } from "./schema"

type StateUpdate<T> = T | ((current: T) => T)

function resolveUpdate<T>(update: StateUpdate<T>, current: T): T {
  return typeof update === "function" ? (update as (current: T) => T)(current) : update
}

export function useRouteListState(searchKey: string, defaults: RouteListState) {
  const navigate = useNavigate()
  const rawState = useLocation({
    select: (location) => (location.search as Record<string, unknown>)[searchKey],
  })
  const state = React.useMemo(
    () => routeListStateSchema.parse(rawState) ?? defaults,
    [defaults, rawState],
  )

  const updateState = React.useCallback(
    (update: (current: RouteListState) => RouteListState) => {
      void navigate({
        search: ((previous: Record<string, unknown>) => {
          const current = routeListStateSchema.parse(previous[searchKey]) ?? defaults
          const next = update(current)
          if (JSON.stringify(current) === JSON.stringify(next)) return previous
          return {
            ...previous,
            [searchKey]: JSON.stringify(next) === JSON.stringify(defaults) ? undefined : next,
          }
        }) as never,
        // 筛选修改当前列表现场；进入详情才新增历史项，返回键可直接回到列表。
        replace: true,
        resetScroll: false,
      })
    },
    [defaults, navigate, searchKey],
  )

  const setConditions = React.useCallback(
    (update: StateUpdate<RouteListState["conditions"]>) => {
      updateState((current) => {
        const conditions = resolveUpdate(update, current.conditions)
        return JSON.stringify(conditions) === JSON.stringify(current.conditions)
          ? current
          : { ...current, conditions, pagination: { ...current.pagination, offset: 0 } }
      })
    },
    [updateState],
  )
  const setSorting = React.useCallback(
    (update: StateUpdate<RouteListState["sorting"]>) => {
      updateState((current) => {
        const sorting = resolveUpdate(update, current.sorting)
        return JSON.stringify(sorting) === JSON.stringify(current.sorting)
          ? current
          : { ...current, sorting, pagination: { ...current.pagination, offset: 0 } }
      })
    },
    [updateState],
  )
  const setPagination = React.useCallback(
    (update: StateUpdate<RouteListState["pagination"]>) => {
      updateState((current) => ({
        ...current,
        pagination: resolveUpdate(update, current.pagination),
      }))
    },
    [updateState],
  )

  return { ...state, setConditions, setPagination, setSorting }
}
