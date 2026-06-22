import type {
  AssistantWorkbenchAttachment,
  AssistantWorkbenchMessage,
  AssistantWorkbenchTarget,
} from '../model'

export interface AssistantWorkbenchAdapter<
  TTarget,
  TMessage,
  TAttachment,
> {
  toWorkbenchTarget: (target: TTarget) => AssistantWorkbenchTarget
  fromWorkbenchTarget: (target: AssistantWorkbenchTarget | null) => TTarget | null
  toWorkbenchMessage: (message: TMessage) => AssistantWorkbenchMessage
  fromWorkbenchMessage: (message: AssistantWorkbenchMessage) => TMessage
  toWorkbenchAttachment: (attachment: TAttachment) => AssistantWorkbenchAttachment
}
