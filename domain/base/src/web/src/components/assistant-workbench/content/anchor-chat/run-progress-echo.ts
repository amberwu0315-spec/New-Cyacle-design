import {
  getAssistantWorkbenchMessages,
  getCurrentLanguage,
  type AppLanguage,
  type AppMessages,
} from '#/components/assistant-workbench/i18n/index.ts'
import type { AssistantRunProgressGroup } from '../../model'

type AssistantWorkbenchMessages = AppMessages['assistantWorkbench']

interface LocalizedText {
  zh?: string
  en?: string
}

interface ModelSkeletonProgressData {
  modelNodeName?: LocalizedText
  modelNodeType?: string
}

interface FactorMappingProgressData {
  factor?: {
    name?: LocalizedText
  }
  unitProcessName?: LocalizedText | string
}

interface DataRecordProgressData {
  name?: LocalizedText
  amount?: string
  unitSymbol?: string
}

interface OutputProductProgressData {
  productDesc?: LocalizedText
  productName?: LocalizedText
  isNewlyCreated?: boolean
}

interface DoneProgressData {
  accountingId?: string
}

export interface AssistantRunProgressEchoSection {
  id: string
  title: string
  metric: string
  description: string
}

export interface AssistantRunProgressEchoSummary {
  summary: string
  sections: Array<AssistantRunProgressEchoSection>
}

function parseProgressItemData<T>(value: string) {
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

function getFallbackMessages() {
  return getAssistantWorkbenchMessages(getCurrentLanguage()).assistantWorkbench
}

function formatLocalizedText(
  value: LocalizedText | string | null | undefined,
  language: AppLanguage = 'zh-CN',
) {
  if (typeof value === 'string') {
    return value.trim() || ''
  }

  if (!value) {
    return ''
  }

  if (language === 'en-US') {
    return value.en?.trim() || value.zh?.trim() || ''
  }

  return value.zh?.trim() || value.en?.trim() || ''
}

function buildKnownStepEcho(
  group: AssistantRunProgressGroup,
  options: {
    language?: AppLanguage
    messages?: AssistantWorkbenchMessages
  } = {},
): AssistantRunProgressEchoSection | null {
  const copy =
    options.messages?.runProgressEcho ?? getFallbackMessages().runProgressEcho
  const language = options.language ?? getCurrentLanguage()

  if (group.step === 'createModelSkeleton') {
    const latest = parseProgressItemData<ModelSkeletonProgressData>(
      group.items.at(-1)?.data ?? '',
    )
    const nodeName = formatLocalizedText(latest?.modelNodeName, language)
    const modelNodeType = latest?.modelNodeType?.trim() || ''
    const nodeType =
      copy?.modelNodeTypes[
        modelNodeType as keyof AssistantWorkbenchMessages['runProgressEcho']['modelNodeTypes']
      ] ||
      modelNodeType ||
      ''

    return {
      id: group.step,
      title: copy.steps.createModelSkeleton,
      metric: copy.metric.nodes(group.items.length),
      description:
        nodeName && nodeType
          ? copy.description.latestAdded(nodeName, nodeType)
          : nodeName
            ? copy.description.latestAdded(nodeName)
            : copy.description.modelSkeletonReady,
    }
  }

  if (group.step === 'factorMapping') {
    const latest = parseProgressItemData<FactorMappingProgressData>(
      group.items.at(-1)?.data ?? '',
    )
    const unitProcessName = formatLocalizedText(
      latest?.unitProcessName,
      language,
    )
    const factorName = formatLocalizedText(latest?.factor?.name, language)

    return {
      id: group.step,
      title: copy.steps.factorMapping,
      metric: copy.metric.matches(group.items.length),
      description:
        unitProcessName && factorName
          ? copy.description.latestMatched(unitProcessName, factorName)
          : unitProcessName
            ? copy.description.latestMatched(unitProcessName)
            : copy.description.factorMappingReady,
    }
  }

  if (group.step === 'createDataRecords') {
    const latest = parseProgressItemData<DataRecordProgressData>(
      group.items.at(-1)?.data ?? '',
    )
    const recordName = formatLocalizedText(latest?.name, language)
    const amount = latest?.amount?.trim() || ''
    const unitSymbol = latest?.unitSymbol?.trim() || ''
    const amountLabel = [amount, unitSymbol].filter(Boolean).join(' ')

    return {
      id: group.step,
      title: copy.steps.createDataRecords,
      metric: copy.metric.records(group.items.length),
      description:
        recordName && amountLabel
          ? copy.description.latestGenerated(recordName, amountLabel)
          : recordName
            ? copy.description.latestGenerated(recordName)
            : copy.description.dataRecordsReady,
    }
  }

  if (group.step === 'setOutputProduct') {
    const latest = parseProgressItemData<OutputProductProgressData>(
      group.items.at(-1)?.data ?? '',
    )
    const productName = formatLocalizedText(latest?.productName, language)
    const productDesc = formatLocalizedText(latest?.productDesc, language)

    return {
      id: group.step,
      title: copy.steps.setOutputProduct,
      metric: productName || copy.metric.productUpdated,
      description: latest?.isNewlyCreated
        ? productDesc || copy.description.outputProductCreated
        : productDesc || copy.description.outputProductReused,
    }
  }

  if (group.step === 'done') {
    const latest = parseProgressItemData<DoneProgressData>(
      group.items.at(-1)?.data ?? '',
    )

    return {
      id: group.step,
      title: copy.steps.done,
      metric: copy.metric.completed,
      description: latest?.accountingId
        ? copy.description.accountingResultReady
        : copy.description.done,
    }
  }

  return null
}

function buildGenericStepEcho(
  group: AssistantRunProgressGroup,
  messages?: AssistantWorkbenchMessages,
): AssistantRunProgressEchoSection | null {
  const runProgressMessages =
    messages?.runProgressEcho ?? getFallbackMessages().runProgressEcho
  const stepLabels = runProgressMessages.steps
  const stepLabel =
    stepLabels?.[group.step as keyof typeof stepLabels] ||
    group.step.trim()

  if (!stepLabel) {
    return null
  }

  return {
    id: group.step,
    title: stepLabel,
    metric: runProgressMessages.metric.results(group.items.length),
    description: runProgressMessages.description.generic,
  }
}

export function summarizeAssistantRunProgress(
  groups: Array<AssistantRunProgressGroup>,
  options: {
    language?: AppLanguage
    messages?: AssistantWorkbenchMessages
  } = {},
): AssistantRunProgressEchoSummary | null {
  const sections = groups.flatMap((group) => {
    const echoSection =
      buildKnownStepEcho(group, options) ??
      buildGenericStepEcho(group, options.messages)

    return echoSection ? [echoSection] : []
  })

  if (sections.length === 0) {
    return null
  }

  const preview = sections
    .slice(0, 2)
    .map((section) => `${section.title} ${section.metric}`)
    .join(' · ')

  return {
    summary:
      (options.messages?.runProgressEcho ?? getFallbackMessages().runProgressEcho)
        .summary(sections.length, preview),
    sections,
  }
}
