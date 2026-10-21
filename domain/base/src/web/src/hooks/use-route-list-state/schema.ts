import { SearchOperator } from "@crew-ui/base"
import { z } from "zod"

// URL 是外部输入；不合法的列表状态按页面默认值处理，避免直连时整页报错。
export const routeListStateSchema = z
  .object({
    conditions: z.array(
      z.object({
        id: z.string(),
        fieldKey: z.string().min(1),
        operator: z.enum(Object.values(SearchOperator)),
        value: z.union([
          z.string(),
          z.array(z.string()),
          z.record(z.string(), z.unknown()),
          z.null(),
        ]),
      }),
    ),
    pagination: z.object({
      offset: z.number().int().nonnegative(),
      limit: z.number().int().positive().max(1000),
    }),
    sorting: z
      .object({
        columnKey: z.string().min(1),
        direction: z.enum(["asc", "desc"]),
      })
      .nullable(),
  })
  .optional()
  .catch(undefined)

export type RouteListState = NonNullable<z.infer<typeof routeListStateSchema>>
