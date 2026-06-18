import type { AppLanguage, AppMessages } from '#/components/assistant-workbench/i18n/index.ts'
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

const RUN_PROGRESS_STEP_LABELS: Record<string, string> = {
  createModelSkeleton: '搭建模型骨架',
  factorMapping: '匹配因子',
  createDataRecords: '生成数据记录',
  setOutputProduct: '设置研究对象',
  done: '执行完成',
}

const MODEL_NODE_TYPE_LABELS: Record<string, string> = {
  phases: '阶段',
  modules: '模块',
  unitProcesses: '单元过程',
}

function parseProgressItemData<T>(value: string) {
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
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
  const copy = options.messages?.runProgressEcho
  const language = options.language ?? 'zh-CN'

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
      MODEL_NODE_TYPE_LABELS[modelNodeType] ||
      modelNodeType ||
      ''

    return {
      id: group.step,
      title:
        copy?.steps.createModelSkeleton ?? RUN_PROGRESS_STEP_LABELS[group.step],
      metric:
        copy?.metric.nodes(group.items.length) ??
        `${group.items.length} 个节点`,
      description:
        nodeName && nodeType
          ? (copy?.description.latestAdded(nodeName, nodeType) ??
            `最近新增：${nodeName} · ${nodeType}`)
          : nodeName
            ? (copy?.description.latestAdded(nodeName) ??
              `最近新增：${nodeName}`)
            : (copy?.description.modelSkeletonReady ??
              '已生成阶段、模块和单元过程骨架。'),
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
      title: copy?.steps.factorMapping ?? RUN_PROGRESS_STEP_LABELS[group.step],
      metric:
        copy?.metric.matches(group.items.length) ??
        `${group.items.length} 条匹配`,
      description:
        unitProcessName && factorName
          ? (copy?.description.latestMatched(unitProcessName, factorName) ??
            `最近匹配：${unitProcessName} -> ${factorName}`)
          : unitProcessName
            ? (copy?.description.latestMatched(unitProcessName) ??
              `最近匹配：${unitProcessName}`)
            : (copy?.description.factorMappingReady ??
              '已为当前模型补齐因子匹配结果。'),
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
      title:
        copy?.steps.createDataRecords ?? RUN_PROGRESS_STEP_LABELS[group.step],
      metric:
        copy?.metric.records(group.items.length) ??
        `${group.items.length} 条记录`,
      description:
        recordName && amountLabel
          ? (copy?.description.latestGenerated(recordName, amountLabel) ??
            `最近生成：${recordName} · ${amountLabel}`)
          : recordName
            ? (copy?.description.latestGenerated(recordName) ??
              `最近生成：${recordName}`)
            : (copy?.description.dataRecordsReady ??
              '已生成本轮核算需要的数据记录。'),
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
      title:
        copy?.steps.setOutputProduct ?? RUN_PROGRESS_STEP_LABELS[group.step],
      metric: productName || copy?.metric.productUpdated || '研究对象已更新',
      description: latest?.isNewlyCreated
        ? productDesc ||
          copy?.description.outputProductCreated ||
          '已新建研究对象并写入当前任务。'
        : productDesc ||
          copy?.description.outputProductReused ||
          '已复用研究对象并写入当前任务。',
    }
  }

  if (group.step === 'done') {
    const latest = parseProgressItemData<DoneProgressData>(
      group.items.at(-1)?.data ?? '',
    )

    return {
      id: group.step,
      title: copy?.steps.done ?? RUN_PROGRESS_STEP_LABELS[group.step],
      metric: copy?.metric.completed ?? '已完成',
      description: latest?.accountingId
        ? (copy?.description.accountingResultReady ??
          '执行结果已写入核算任务，可继续查看详情。')
        : (copy?.description.done ?? '本轮执行已完成并返回结果。'),
    }
  }

  return null
}

function buildGenericStepEcho(
  group: AssistantRunProgressGroup,
  messages?: AssistantWorkbenchMessages,
): AssistantRunProgressEchoSection | null {
  const stepLabels = messages?.runProgressEcho.steps
  const stepLabel =
    stepLabels?.[group.step as keyof typeof stepLabels] ||
    RUN_PROGRESS_STEP_LABELS[group.step] ||
    group.step.trim()

  if (!stepLabel) {
    return null
  }

  return {
    id: group.step,
    title: stepLabel,
    metric:
      messages?.runProgressEcho.metric.results(group.items.length) ??
      `${group.items.length} 条结果`,
    description:
      messages?.runProgressEcho.description.generic ??
      '已返回可用于回显的执行结果。',
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
      options.messages?.runProgressEcho.summary(sections.length, preview) ??
      `${sections.length} 个阶段${preview ? ` · ${preview}` : ''}`,
    sections,
  }
}
