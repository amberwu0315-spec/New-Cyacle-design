import type { ComponentPropsWithoutRef } from 'react'

import { cn } from '#/lib/utils.ts'

export type ModuleLayoutProps = ComponentPropsWithoutRef<'div'>

export function ModuleLayout({
  children,
  className,
  ...props
}: ModuleLayoutProps) {
  /*
   * ModuleLayout 是给 web module 页面使用的统一的轻量内容容器。
   * 它只提供常规页面 padding 和背景默认值。简单页面可以直接使用它；
   * 如果功能需要更高密度的控件、分栏、嵌入式流程或自定义 chrome，
   * module 也可以换成自己的页面布局。
   */
  return (
    <div
      {...props}
      data-slot='module-layout'
      className={cn('min-h-full bg-background px-4 py-5 sm:px-6 lg:px-8', className)}
    >
      {children}
    </div>
  )
}
