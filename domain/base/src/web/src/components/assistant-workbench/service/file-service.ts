import type { AssistantDraftAttachment } from '../content'
import {
  getAssistantWorkbenchMessages,
  getCurrentLanguage,
} from '../i18n/index.ts'
import { uploadConfiguredAssistantAttachment } from './agent-service-runtime'

export async function uploadAssistantDraftAttachment(
  attachment: AssistantDraftAttachment,
  options: {
    organizationId?: string | null
    missingOrganizationMessage?: string
  },
) {
  const organizationId = options.organizationId?.trim()
  const messages =
    getAssistantWorkbenchMessages(getCurrentLanguage()).assistantWorkbench

  if (!organizationId) {
    throw new Error(
      options.missingOrganizationMessage ??
        messages.errors.missingOrganizationForUpload,
    )
  }

  return uploadConfiguredAssistantAttachment(attachment, {
    organizationId,
  })
}
