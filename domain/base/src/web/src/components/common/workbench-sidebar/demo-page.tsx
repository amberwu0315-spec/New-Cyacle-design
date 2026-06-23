import * as React from 'react'
import {
  BarChart3,
  Component,
  Database,
  FileSpreadsheet,
  FileText,
  FlaskConical,
  GitBranch,
  Info,
  Layers2,
  Package,
  Package2,
  Scale,
  ScrollText,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Workflow,
} from 'lucide-react'

import { cn } from '#/lib/utils.ts'

import { useWorkbenchSidebar, WorkbenchSidebar } from './workbench-sidebar'
import type { WorkbenchSidebarIcon } from './workbench-sidebar'

type DemoMode = 'simple' | 'professional'

interface DemoMenuItem {
  compactLabel: string
  disabled?: boolean
  icon: WorkbenchSidebarIcon
  id: string
  label: string
}

interface DemoMenuGroup {
  items: Array<DemoMenuItem>
  title: string
}

const DEMO_MENU_GROUPS: Array<DemoMenuGroup> = [
  {
    title: '核算信息',
    items: [
      { id: 'basic', label: '基础信息', compactLabel: '基础', icon: Info },
      { id: 'output', label: '输出产品', compactLabel: '产品', icon: Package2 },
      { id: 'settings', label: '核算设置', compactLabel: '设置', icon: Settings },
    ],
  },
  {
    title: '计算分析',
    items: [
      {
        id: 'model-detail',
        label: '模型详情',
        compactLabel: '详情',
        icon: SlidersHorizontal,
      },
      {
        id: 'model-canvas',
        label: '模型画布',
        compactLabel: '画布',
        icon: GitBranch,
      },
      {
        id: 'analysis-tools',
        label: '分析工具',
        compactLabel: '分析',
        icon: BarChart3,
      },
    ],
  },
  {
    title: '数据透视',
    items: [
      {
        id: 'activity-data',
        label: '活动数据',
        compactLabel: '活动',
        icon: ScrollText,
      },
      {
        id: 'factor-data',
        label: '因子数据',
        compactLabel: '因子',
        icon: FlaskConical,
      },
    ],
  },
  {
    title: '交付成果',
    items: [
      { id: 'export-values', label: '导出数值', compactLabel: '导出', icon: Scale },
      {
        id: 'report-charts',
        label: '核算图表',
        compactLabel: '图表',
        icon: BarChart3,
      },
      {
        id: 'lci-results',
        label: 'LCI结果',
        compactLabel: 'LCI',
        icon: FileSpreadsheet,
        disabled: true,
      },
      { id: 'report', label: '核算报告', compactLabel: '报告', icon: FileText },
    ],
  },
]

const DEMO_UNGROUPED_ITEMS: Array<DemoMenuItem> = [
  { id: 'allocation-rules', label: '分配规则', compactLabel: '分配', icon: Workflow },
  { id: 'products', label: '产品列表', compactLabel: '产品', icon: Package },
  { id: 'data-records', label: '数据记录', compactLabel: '数据', icon: Database },
  { id: 'documents', label: '文档管理', compactLabel: '文档', icon: FileText },
]

function findDemoMenuItem(itemId: string) {
  for (const group of DEMO_MENU_GROUPS) {
    const matchedItem = group.items.find((item) => item.id === itemId)

    if (matchedItem) {
      return matchedItem
    }
  }

  return DEMO_UNGROUPED_ITEMS.find((item) => item.id === itemId) ?? null
}

function DemoModeSwitch({
  mode,
  onModeChange,
}: {
  mode: DemoMode
  onModeChange: (mode: DemoMode) => void
}) {
  const { expanded } = useWorkbenchSidebar()
  const handleSimpleClick = React.useCallback(() => {
    onModeChange('simple')
  }, [onModeChange])
  const handleProfessionalClick = React.useCallback(() => {
    onModeChange('professional')
  }, [onModeChange])

  if (!expanded) {
    const CurrentIcon = mode === 'professional' ? Component : Layers2

    return (
      <button
        type="button"
        aria-label={mode === 'professional' ? '专业模式' : '简洁模式'}
        className="mx-auto flex size-[52px] flex-col items-center justify-center gap-1 rounded-md bg-background text-sm font-semibold text-primary shadow-sm transition-colors hover:bg-primary/10"
        onClick={
          mode === 'professional' ? handleSimpleClick : handleProfessionalClick
        }
      >
        <CurrentIcon className="size-4" />
        <span className="max-w-full truncate text-[13px] leading-none">
          {mode === 'professional' ? '专业' : '简洁'}
        </span>
      </button>
    )
  }

  return (
    <div
      className="mx-auto flex w-full items-center gap-0.5 rounded-md bg-muted p-0.5"
      role="group"
      aria-label="菜单模式"
    >
      <button
        type="button"
        aria-pressed={mode === 'simple'}
        className={cn(
          'flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md px-2 text-sm font-medium transition-colors',
          mode === 'simple'
            ? 'bg-background text-primary shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
        )}
        onClick={handleSimpleClick}
      >
        <Layers2 className="size-4 shrink-0" />
      </button>
      <button
        type="button"
        aria-pressed={mode === 'professional'}
        className={cn(
          'flex h-9 min-w-0 flex-[1.35] items-center justify-center gap-1.5 rounded-md px-2 text-sm font-medium transition-colors',
          mode === 'professional'
            ? 'bg-background text-primary shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
        )}
        onClick={handleProfessionalClick}
      >
        <Component className="size-4 shrink-0" />
        <span className="truncate">专业模式</span>
      </button>
    </div>
  )
}

export function WorkbenchSidebarDemoPage() {
  const [activeItemId, setActiveItemId] = React.useState('analysis-tools')
  const [mode, setMode] = React.useState<DemoMode>('professional')
  const activeItem = findDemoMenuItem(activeItemId)
  const handleItemSelect = React.useCallback(
    ({ id }: { id: string }) => {
      const item = findDemoMenuItem(id)

      if (!item || item.disabled) {
        return
      }

      setActiveItemId(id)
    },
    [],
  )
  const handleModeChange = React.useCallback((nextMode: DemoMode) => {
    setMode(nextMode)
  }, [])

  return (
    <div className="h-[calc(100dvh-3.5rem)] min-h-0 overflow-hidden bg-sidebar px-5 py-4 text-foreground">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl gap-3 overflow-hidden bg-sidebar">
        <WorkbenchSidebar
          activeItemId={activeItemId}
          className="h-full"
          labels={{ navigation: '产品碳核算菜单' }}
          storageKey="workbench-sidebar-demo-expanded"
          onItemSelect={handleItemSelect}
        >
          <WorkbenchSidebar.Content>
            {DEMO_MENU_GROUPS.map((group) => (
              <WorkbenchSidebar.Group key={group.title} title={group.title}>
                {group.items.map((item) => (
                  <WorkbenchSidebar.Item
                    key={item.id}
                    compactLabel={item.compactLabel}
                    disabled={item.disabled}
                    icon={item.icon}
                    id={item.id}
                  >
                    {item.label}
                  </WorkbenchSidebar.Item>
                ))}
              </WorkbenchSidebar.Group>
            ))}
          </WorkbenchSidebar.Content>
          <WorkbenchSidebar.Footer>
            <WorkbenchSidebar.Ungrouped>
              {DEMO_UNGROUPED_ITEMS.map((item) => (
                <WorkbenchSidebar.Item
                  key={item.id}
                  compactLabel={item.compactLabel}
                  icon={item.icon}
                  id={item.id}
                >
                  {item.label}
                </WorkbenchSidebar.Item>
              ))}
            </WorkbenchSidebar.Ungrouped>
            <WorkbenchSidebar.Bottom>
              <DemoModeSwitch mode={mode} onModeChange={handleModeChange} />
            </WorkbenchSidebar.Bottom>
          </WorkbenchSidebar.Footer>
        </WorkbenchSidebar>

        <main className="min-w-0 flex-1 overflow-y-auto bg-background">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 py-6">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-primary">{mode}</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-normal">
                {activeItem?.label ?? '分析工具'}
              </h1>
            </div>
            <div className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground shadow-sm">
              <ShieldCheck className="size-4 text-primary" />
              <span>已保存</span>
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-md border bg-background p-5 shadow-sm">
              <h2 className="text-base font-semibold">阈值参数</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                用于识别重要贡献项与可排除项。
              </p>
              <dl className="mt-5 grid gap-4 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">重要性阈值</dt>
                  <dd className="font-semibold">1%</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">排除性阈值</dt>
                  <dd className="font-semibold">5%</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-md border bg-background p-5 shadow-sm">
              <h2 className="text-base font-semibold">未量化说明</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                不排除，进入后续说明与审阅。
              </p>
              <div className="mt-5 h-24 rounded-md border border-dashed bg-muted/30" />
            </div>
          </section>

          <section className="rounded-md border bg-background shadow-sm">
            <div className="border-b px-5 py-4">
              <h2 className="text-base font-semibold">已排除项列表</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                仅展示已经确认排除的单元过程。
              </p>
            </div>
            <div className="grid grid-cols-[1fr_9rem_9rem] border-b px-5 py-3 text-sm font-medium">
              <span>排除项</span>
              <span>阶段</span>
              <span>占比</span>
            </div>
            <div className="h-48" />
          </section>

          <section className="rounded-md border bg-background shadow-sm">
            <div className="border-b px-5 py-4">
              <h2 className="text-base font-semibold">未排除项列表</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                支持按占比阈值筛选未排除单元。
              </p>
            </div>
            <div className="grid grid-cols-[1fr_9rem_9rem] border-b px-5 py-3 text-sm font-medium">
              <span>排除项</span>
              <span>阶段</span>
              <span>占比</span>
            </div>
            <div className="h-56" />
          </section>
          </div>
        </main>
      </div>
    </div>
  )
}
