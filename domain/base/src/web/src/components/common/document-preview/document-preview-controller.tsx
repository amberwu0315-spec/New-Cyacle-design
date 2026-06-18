import * as React from 'react'

import {
  DocumentPreviewDialog,
  type DocumentPreviewDialogProps,
} from './document-preview-dialog'
import type { DocumentsPreviewItem } from './documents-preview'

export type DocumentPreviewDialogRenderer = (
  props: DocumentPreviewDialogProps,
) => React.ReactNode

export interface OpenDocumentPreviewOptions
  extends Omit<DocumentPreviewDialogProps, 'item' | 'onOpenChange' | 'open'> {
  item: DocumentsPreviewItem
  onOpenChange?: (open: boolean) => void
  renderDialog?: DocumentPreviewDialogRenderer
}

interface DocumentPreviewSnapshot {
  open: boolean
  options: OpenDocumentPreviewOptions | null
  sequence: number
}

const documentPreviewListeners = new Set<() => void>()

let documentPreviewSnapshot: DocumentPreviewSnapshot = {
  open: false,
  options: null,
  sequence: 0,
}

function renderDefaultDocumentPreviewDialog(props: DocumentPreviewDialogProps) {
  return <DocumentPreviewDialog {...props} />
}

let configuredDocumentPreviewDialogRenderer: DocumentPreviewDialogRenderer =
  renderDefaultDocumentPreviewDialog

function emitDocumentPreviewChange() {
  documentPreviewListeners.forEach((listener) => listener())
}

function setDocumentPreviewSnapshot(snapshot: DocumentPreviewSnapshot) {
  documentPreviewSnapshot = snapshot
  emitDocumentPreviewChange()
}

function subscribeDocumentPreview(listener: () => void) {
  documentPreviewListeners.add(listener)

  return () => {
    documentPreviewListeners.delete(listener)
  }
}

function getDocumentPreviewSnapshot() {
  return documentPreviewSnapshot
}

function isDocumentsPreviewItem(
  input: DocumentsPreviewItem | OpenDocumentPreviewOptions,
): input is DocumentsPreviewItem {
  return 'viewerFile' in input && 'source' in input
}

function normalizeOpenDocumentPreviewOptions(
  input: DocumentsPreviewItem | OpenDocumentPreviewOptions,
): OpenDocumentPreviewOptions {
  if (isDocumentsPreviewItem(input)) {
    return { item: input }
  }

  return input
}

export function configureDocumentPreviewDialogRenderer(
  renderer: DocumentPreviewDialogRenderer,
) {
  configuredDocumentPreviewDialogRenderer = renderer
  emitDocumentPreviewChange()

  return () => {
    if (configuredDocumentPreviewDialogRenderer === renderer) {
      configuredDocumentPreviewDialogRenderer = renderDefaultDocumentPreviewDialog
      emitDocumentPreviewChange()
    }
  }
}

export function openDocumentPreview(
  input: DocumentsPreviewItem | OpenDocumentPreviewOptions,
) {
  const sequence = documentPreviewSnapshot.sequence + 1

  setDocumentPreviewSnapshot({
    open: true,
    options: normalizeOpenDocumentPreviewOptions(input),
    sequence,
  })

  return () => {
    closeDocumentPreview(sequence)
  }
}

export function closeDocumentPreview(sequence?: number) {
  if (sequence != null && documentPreviewSnapshot.sequence !== sequence) {
    return
  }

  if (!documentPreviewSnapshot.open && !documentPreviewSnapshot.options) {
    return
  }

  setDocumentPreviewSnapshot({
    open: false,
    options: null,
    sequence: documentPreviewSnapshot.sequence + 1,
  })
}

export function DocumentPreviewHost() {
  const snapshot = React.useSyncExternalStore(
    subscribeDocumentPreview,
    getDocumentPreviewSnapshot,
    getDocumentPreviewSnapshot,
  )
  const { options } = snapshot
  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      options?.onOpenChange?.(open)

      if (!open) {
        closeDocumentPreview(snapshot.sequence)
      }
    },
    [options, snapshot.sequence],
  )

  if (!options) {
    return null
  }

  const { item, onOpenChange, renderDialog, ...dialogProps } = options
  void onOpenChange
  const renderer = renderDialog ?? configuredDocumentPreviewDialogRenderer

  return (
    <>
      {renderer({
        ...dialogProps,
        item,
        onOpenChange: handleOpenChange,
        open: snapshot.open,
      })}
    </>
  )
}
