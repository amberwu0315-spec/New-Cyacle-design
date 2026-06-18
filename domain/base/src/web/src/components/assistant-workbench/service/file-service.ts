import type { AssistantDraftAttachment } from '../content'
import { uploadConfiguredAssistantAttachment } from './agent-service-runtime'

export async function uploadAssistantDraftAttachment(
  attachment: AssistantDraftAttachment,
  options: {
    organizationId?: string | null
    missingOrganizationMessage?: string
  },
) {
  const organizationId = options.organizationId?.trim()

  if (!organizationId) {
    throw new Error(
      options.missingOrganizationMessage ??
        '当前组织信息缺失，暂时无法上传附件。',
    )
  }

  return uploadConfiguredAssistantAttachment(attachment, {
    organizationId,
  })
}
