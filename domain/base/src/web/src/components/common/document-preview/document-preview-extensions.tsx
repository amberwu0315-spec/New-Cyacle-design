import * as React from 'react'
import { X } from 'lucide-react'
import type {
  FileViewerExcelOptions,
  ViewerFile,
  ViewerImageFileOptions,
} from '@cew-lib/file-viewer-base'

import { Button } from '#/components/ui/button.tsx'
import { cn } from '#/lib/utils.ts'

import type { DocumentsPreviewItem } from './documents-preview'

/** 预览扩展的匹配入参。 */
export interface DocumentPreviewExtensionContext {
  file: ViewerFile | null
  item: DocumentsPreviewItem | null
  open: boolean
  viewerKind: ViewerKind | null
}

type ViewerKind = ViewerFile['viewerKind']

/** 预览扩展的渲染入参。 */
export interface DocumentPreviewExtensionRenderContext
  extends DocumentPreviewExtensionContext {
  /** 该扩展的右侧面板当前是否展开。 */
  active: boolean
  /** 展开该扩展的右侧面板，同时收起其它面板。 */
  activate: () => void
  /** 收起该扩展的右侧面板。 */
  deactivate: () => void
  /** 切换该扩展的右侧面板。 */
  toggle: () => void
}

/** 扩展注入给 viewer 的配置，与扩展面板是否展开无关。 */
export interface DocumentPreviewExtensionViewerOptions {
  excel?: FileViewerExcelOptions
  image?: ViewerImageFileOptions
}

/** viewerOptions 也可以按当前预览上下文动态给出（例如异步拿到的图片 OCR 块）。 */
export type DocumentPreviewExtensionViewerOptionsResolver = (
  context: DocumentPreviewExtensionContext,
) => DocumentPreviewExtensionViewerOptions | undefined

export function resolveDocumentPreviewViewerOptions(
  extension: DocumentPreviewExtension,
  context: DocumentPreviewExtensionContext,
) {
  const options = extension.viewerOptions

  return typeof options === 'function' ? options(context) : options
}

let viewerOptionsVersion = 0
const viewerOptionsListeners = new Set<() => void>()

/** 业务侧异步准备好 viewer 数据（如 OCR 块）后调用，预览弹窗会重新取值。 */
export function notifyDocumentPreviewViewerOptionsChanged() {
  viewerOptionsVersion += 1
  viewerOptionsListeners.forEach((listener) => listener())
}

function subscribeViewerOptions(listener: () => void) {
  viewerOptionsListeners.add(listener)

  return () => {
    viewerOptionsListeners.delete(listener)
  }
}

export function useDocumentPreviewViewerOptionsVersion() {
  return React.useSyncExternalStore(
    subscribeViewerOptions,
    () => viewerOptionsVersion,
    () => viewerOptionsVersion,
  )
}

/** 声明式工具栏按钮，base 负责按钮外观与选中态。 */
export interface DocumentPreviewToolbarAction {
  icon?: React.ReactNode
  label: string
}

/**
 * 文档预览扩展：业务域通过它往统一的预览弹窗里挂工具栏按钮与右侧面板，
 * base 只负责渲染与互斥，不感知任何业务语义。
 */
export interface DocumentPreviewExtension {
  id: string
  /** 返回 false 时该扩展不参与当前预览；不传表示所有预览都参与。 */
  match?: (context: DocumentPreviewExtensionContext) => boolean
  /** 注入 viewer 配置，例如 excel.onReady。 */
  viewerOptions?:
    | DocumentPreviewExtensionViewerOptions
    | DocumentPreviewExtensionViewerOptionsResolver
  /** 声明式工具栏按钮，优先级低于 renderToolbarAction。 */
  toolbarAction?: (
    context: DocumentPreviewExtensionRenderContext,
  ) => DocumentPreviewToolbarAction
  /** 顶部工具栏按钮，需要完全自定义按钮时使用。 */
  renderToolbarAction?: (context: DocumentPreviewExtensionRenderContext) => React.ReactNode
  /** 右侧面板内容。 */
  renderSidePanel?: (context: DocumentPreviewExtensionRenderContext) => React.ReactNode
  /** 浮在预览区之上的层（如基于选区/坐标的交互），业务自行定位。 */
  renderViewerOverlay?: (
    context: DocumentPreviewExtensionRenderContext,
  ) => React.ReactNode
}

export interface DocumentPreviewSidePanelProps {
  children: React.ReactNode
  className?: string
  closeLabel: string
  icon?: React.ReactNode
  onClose: () => void
  title: string
}

/** 预览扩展右侧面板的统一外壳，保证与版本历史面板视觉一致。 */
export function DocumentPreviewSidePanel({
  children,
  className,
  closeLabel,
  icon,
  onClose,
  title,
}: DocumentPreviewSidePanelProps) {
  return (
    <aside
      className={cn(
        'flex w-80 shrink-0 flex-col border-l bg-background',
        className,
      )}
    >
      <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b px-4">
        <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
          {icon}
          <span className="min-w-0 truncate">{title}</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={closeLabel}
          onClick={onClose}
        >
          <X className="size-4" />
        </Button>
      </div>
      {children}
    </aside>
  )
}

const documentPreviewExtensions = new Map<string, DocumentPreviewExtension>()
const documentPreviewExtensionListeners = new Set<() => void>()

let documentPreviewExtensionsSnapshot: ReadonlyArray<DocumentPreviewExtension> = []

function emitDocumentPreviewExtensionsChange() {
  documentPreviewExtensionsSnapshot = [...documentPreviewExtensions.values()]
  documentPreviewExtensionListeners.forEach((listener) => listener())
}

/** 注册预览扩展，同 id 覆盖；返回注销函数。 */
export function registerDocumentPreviewExtension(extension: DocumentPreviewExtension) {
  documentPreviewExtensions.set(extension.id, extension)
  emitDocumentPreviewExtensionsChange()

  return () => {
    if (!documentPreviewExtensions.has(extension.id)) {
      return
    }

    documentPreviewExtensions.delete(extension.id)
    emitDocumentPreviewExtensionsChange()
  }
}

function subscribeDocumentPreviewExtensions(listener: () => void) {
  documentPreviewExtensionListeners.add(listener)

  return () => {
    documentPreviewExtensionListeners.delete(listener)
  }
}

function getDocumentPreviewExtensionsSnapshot() {
  return documentPreviewExtensionsSnapshot
}

/** 读取当前已注册的预览扩展。 */
export function useDocumentPreviewExtensions() {
  return React.useSyncExternalStore(
    subscribeDocumentPreviewExtensions,
    getDocumentPreviewExtensionsSnapshot,
    getDocumentPreviewExtensionsSnapshot,
  )
}
