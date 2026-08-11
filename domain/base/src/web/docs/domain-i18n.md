# Domain 多语言

[← 返回 Web 文档入口](../web.md)

> 职责：规定领域文案目录、类型来源、React 与非 React 场景的多语言消费方式。

Domain 自己维护业务文案时，统一放 `src/lib/i18n`。领域内只用通用名：`i18nCatalog`、`getMessages`、`useTranslation`、`Messages`。需要暴露给其它 domain/app 时通过 `pub` 导出，跨 domain 使用时在 import 处 alias。

```text
domain/catalog/src/web/src/lib/i18n/
├── i18n-catalog.ts
├── index.ts
└── messages/
    ├── zh-CN/
    │   └── index.ts     ← 导出 zhCN 和 type Messages = typeof zhCN
    └── en-US/
        └── index.ts     ← enUS satisfies Messages
```

```ts
// domain/catalog/src/web/src/lib/i18n/i18n-catalog.ts
import { createI18nCatalog } from '@example-app/web-base'

import { enUS } from './messages/en-US'
import type { Messages } from './messages/zh-CN'
import { zhCN } from './messages/zh-CN'

export const i18nCatalog = createI18nCatalog<Messages>({
  'zh-CN': zhCN,
  'en-US': enUS,
})

export const getMessages = i18nCatalog.getMessages
export const useTranslation = i18nCatalog.useTranslation
```

```ts
// domain/catalog/src/web/src/lib/i18n/index.ts
export { formatMessage } from '@example-app/web-base'
export {
  getMessages,
  i18nCatalog,
  useTranslation,
} from './i18n-catalog'
export type { Messages } from './messages/zh-CN'
```

React 组件从本 domain 的 `useTranslation()` 取文案；需要插值时用 hook 返回的 `format`。

```tsx
import { useTranslation } from '#/lib/i18n/index.ts'

export function HomePage() {
  const { t, format } = useTranslation()

  return (
    <section>
      <h1>{t.home.title}</h1>
      <p>{format(t.home.count, { count: 12 })}</p>
    </section>
  )
}
```

非 React 场景显式传入语言，例如 nav factory：

```ts
import type { DomainNavMetaFactory } from '@example-app/web-base'
import { Boxes } from 'lucide-react'

import { getMessages } from '#/lib/i18n/index.ts'

export const createCatalogNavMeta: DomainNavMetaFactory = ({ language }) => {
  const t = getMessages(language)

  return {
    label: t.common.nav.label,
    desc: t.common.nav.desc,
    icon: Boxes,
    defaultTo: '/catalog',
    groups: [
      {
        id: 'catalog-main',
        title: t.common.nav.groupTitle,
        items: [
          {
            id: 'catalog-home',
            label: t.common.nav.homeLabel,
            to: '/catalog',
            icon: Boxes,
          },
        ],
      },
    ],
  }
}
```

规则：

- `index.ts` 只做 re-export，不写配置和工厂逻辑。
- `zh-CN` 作为类型来源，其他语言用 `satisfies Messages` 校验结构。
- 不在领域内 API 名里加 domain 前缀；跨 domain 或 app 层同时消费多个 domain i18n 时，在 import 处取别名。

```ts
// domain/catalog/src/web/src/pub/index.ts
export { getMessages } from '#/lib/i18n/index.ts'

// 消费方
import { getMessages as getCatalogDomainMessages } from '@example-app/web-catalog/pub'
```
