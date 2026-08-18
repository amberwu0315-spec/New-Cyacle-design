import type * as React from 'react'

export type AssistantWorkbenchDisplayMode = 'sheet' | 'dialog'

export type AssistantWorkbenchRenderMode =
  | 'sheet'
  | 'dialog'
  | 'embedded'
  | 'floating'

export type AssistantWorkbenchThreadStrategy =
  | 'reuse-current-thread'
  | 'new-thread'

export interface AssistantWorkbenchTarget {
  id: string
  label: string
  title: string
  section?: string
  description?: string
  currentSummary?: string
  note?: string
  metadata?: Record<string, unknown>
}

export interface AssistantAnchorDisplay {
  title?: string | null
}

export type AssistantAnchorKind = 'ENTITY'

export type AssistantAnchorMode = 'HARD' | 'SOFT'

export type AssistantAnchorDataType =
  | 'PROJECT'
  | 'MODEL'
  | 'PHASE'
  | 'MODULE'
  | 'UNIT_PROCESS'
  | 'OUTPUT'
  | 'ACCOUNTING'
  | 'DATA_RECORD'
  | 'FACTOR'
  | 'DOCUMENT'
  | 'ALLOCATION_RULE'

export interface AssistantAnchorDeclaration {
  dataType: AssistantAnchorDataType
  dataId: string
  kind?: AssistantAnchorKind
  mode?: AssistantAnchorMode
  display?: AssistantAnchorDisplay | null
}

export interface AssistantDisplayAnchorItem {
  id: string
  label: string
  typeLabel?: string | null
}

export interface AssistantThreadSummary {
  threadId: string
  createdAt: string
  summary: string
}

export interface AssistantToolCallSummary {
  id?: string | null
  name: string
  input?: string | null
}

export interface AssistantToolResultSummary {
  id?: string | null
  name: string
  output?: string | null
}

export interface AssistantResolvedAnchorSummary {
  status: 'EMPTY' | 'RESOLVED' | 'CONFLICTED' | 'REJECTED' | 'UNSPECIFIED'
  summary?: string | null
  resolvedAnchorsSummary?: Array<{
    dataType: AssistantAnchorDataType
    name: string
  }>
  anchorErrors?: Array<{
    code: string
    message?: string | null
    dataType?: AssistantAnchorDataType
    dataId?: string
  }> | null
}

export interface AssistantSuggestion {
  content: string
}

export interface AssistantArea {
  id: string
  title: string
  description?: string
}

export interface AssistantLaunchArea {
  area: AssistantArea
  anchors?: Array<AssistantAnchorDeclaration>
  suggestions?: Array<AssistantSuggestion>
}

export interface AssistantAnchorChatSession {
  activationId: string
  threadStrategy: AssistantWorkbenchThreadStrategy
}

export interface AssistantThreadTag {
  key: string
  value: string
}

export interface AssistantConversationScene {
  sceneName: 'Accounting' | 'ProjectData' | 'OrgData'
  threadTags: Array<AssistantThreadTag>
  defaultAnchors: Array<AssistantAnchorDeclaration>
}

export interface AssistantPendingInteractionOption {
  id: string
  label: string
  description?: string | null
  disabled?: boolean | null
}

export interface AssistantPendingInteraction {
  id: string
  threadId: string
  runId: string
  lastEventId?: string | null
  kind: 'CONFIRM' | 'CHOICE' | 'UNSPECIFIED'
  title: string
  body?: string | null
  selectionMode?: 'SINGLE' | 'MULTIPLE' | 'UNSPECIFIED' | null
  options: Array<AssistantPendingInteractionOption>
  status: 'PENDING' | 'ANSWERED' | 'CANCELLED' | 'EXPIRED' | 'UNSPECIFIED'
  createdAt: string
  respondedAt?: string | null
}

export interface AssistantRunState {
  runId: string
  threadId: string
  messageId?: string | null
  status:
    | 'idle'
    | 'queued'
    | 'running'
    | 'waiting_user'
    | 'completed'
    | 'failed'
    | 'cancelled'
  lastEventId?: string | null
  errorMessage?: string | null
  terminalEventReceived?: boolean
}

export interface AssistantRunProgressItem {
  id: string
  data: string
  itemIndex: number
  createdAt: string
}

export interface AssistantRunProgressGroup {
  runId: string
  step: string
  items: Array<AssistantRunProgressItem>
}

export interface AssistantRunProgressLoadState {
  status: 'idle' | 'loading' | 'loaded' | 'error'
  groups: Array<AssistantRunProgressGroup>
  errorMessage?: string | null
}

export interface AssistantStreamProgressItem {
  id: string
  type: string
  name: string
  status?: string
  title: string
  message?: string | null
  level?: string | null
  createdAt: string
}

export interface AssistantStreamPacket {
  v: string
  id: string
  type: string
  name: string
  runId: string
  threadId: string
  ts?: string
  status?: string
  scope?: {
    kind?: string
    id?: string
    parentId?: string
    tool?: string
    attempt?: number
    index?: number
  } | null
  display?: {
    title?: string
    message?: string
    level?: string
    progressLabel?: string
  } | null
  data?: Record<string, unknown>
  meta?: Record<string, unknown>
}

export interface AssistantAnchorChatProtocol {
  type: 'anchor-chat'
  version: 1
  launchArea: AssistantLaunchArea
  session?: AssistantAnchorChatSession
  seed?: {
    messages?: Array<AssistantWorkbenchMessage>
  }
  feedback?: {
    mode?: 'message-only' | 'refresh-query'
    targetId?: string
    onApplied?: (args: {
      protocol: AssistantAnchorChatProtocol
    }) => Promise<void> | void
  }
}

export type AssistantContentProtocol = AssistantAnchorChatProtocol

export interface AssistantWorkbenchMessage {
  id: string
  role: 'system' | 'user' | 'assistant' | 'agent'
  kind: 'message' | 'action'
  title?: string
  content: string
  runId?: string
  threadId?: string
  thinking?: {
    title?: string
    content: string
    rawContent?: string
    collapsed?: boolean
  }
  createdAt: string
  anchorId?: string | null
  anchors?: Array<AssistantAnchorDeclaration>
  attachments?: Array<AssistantWorkbenchAttachment>
  status?: 'queued' | 'running' | 'completed' | 'failed'
  toolCalls?: Array<AssistantToolCallSummary>
  toolResults?: Array<AssistantToolResultSummary>
  resolvedAnchorsSummary?: AssistantResolvedAnchorSummary | null
}

export interface AssistantWorkbenchAttachment {
  id: string
  name: string
  noteText?: string
  mimeType: string
  sizeText?: string
  uploadedAt?: string
  previewUrl?: string
  downloadUrl?: string
}

export interface AssistantWorkbenchSnapshot {
  open: boolean
  displayMode: AssistantWorkbenchDisplayMode
  renderMode: AssistantWorkbenchRenderMode
  contentProtocol: AssistantContentProtocol | null
  activeTarget: AssistantWorkbenchTarget | null
  messages: Array<AssistantWorkbenchMessage>
  composerValue: string
  attachments: Array<AssistantWorkbenchAttachment>
  sending: boolean
  focusSignal: number
}

export interface AssistantWorkbenchOpenForTargetOptions {
  renderMode?: AssistantWorkbenchRenderMode
  messages?: Array<AssistantWorkbenchMessage>
  resetDraft?: boolean
  requestFocus?: boolean
}

export interface AssistantWorkbenchOpenWithProtocolOptions {
  renderMode?: AssistantWorkbenchRenderMode
  resetDraft?: boolean
  requestFocus?: boolean
}

export interface AssistantAnchorChatOpenRequest<
  TLaunchArea extends AssistantLaunchArea = AssistantLaunchArea,
> {
  launchArea: TLaunchArea
  session?: AssistantAnchorChatSession
  renderMode?: AssistantWorkbenchRenderMode
  resetDraft?: boolean
  requestFocus?: boolean
  feedback?: AssistantAnchorChatProtocol['feedback']
}

export interface AssistantPanelContentProps {
  title?: React.ReactNode
  description?: React.ReactNode
  headerBadge?: React.ReactNode
  headerActions?: React.ReactNode
  hideHeader?: boolean
  headerClassName?: string
  bodyShellClassName?: string
  viewportContentClassName?: string
  messagesClassName?: string
  sidebar?: React.ReactNode
  sidebarClassName?: string
  hasMessages?: boolean
  canLoadMoreAbove?: boolean
  loadingMoreAbove?: boolean
  onReachTop?: () => void
  topReachThresholdPx?: number
  viewportStateKey?: string | number | null
  messageViewportRef?: React.RefObject<HTMLDivElement | null>
  messages: React.ReactNode
  composer?: React.ReactNode
  composerClassName?: string
  footer?: React.ReactNode
  empty?: React.ReactNode
  className?: string
}
