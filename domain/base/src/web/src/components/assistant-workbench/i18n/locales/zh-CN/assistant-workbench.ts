export const assistantWorkbenchMessages = {
  brand: {
    ai: 'AI',
    assistantName: '青钥助手',
    panelTitle: '协作助手',
    panelAriaLabel: 'AI 协作助手',
    sheetPanelDescription: '右侧协作助手面板。',
    dialogPanelDescription: '独立协作助手弹框。',
    entryLabel: 'AI',
    entryTooltip: '青钥助手',
  },
  composer: {
    placeholder: {
      docked: '描述您的想法',
      landing: '输入您的问题，或描述希望 AI 协助的内容',
    },
    stopGenerating: '停止生成',
    send: '发送',
    currentTargetArea: (title: string) => `当前目标区域：${title}`,
    clearCurrentArea: '清除当前区域',
    addSupplementFiles: '添加补充文件',
    uploadMaterials: '上传材料',
    attachmentLimitHint: (maxCount: number, maxFileSizeMb: number) =>
      `最多添加 ${maxCount} 份材料，单个文件不超过 ${maxFileSizeMb} MB`,
    defaultAttachmentOnlyPrompt: '请结合我上传的文件继续分析。',
  },
  attachments: {
    unnamedFile: '<未命名>',
    fileKinds: {
      excel: '表格',
      folder: '文件夹',
      image: '图片',
      keynote: 'Keynote',
      pdf: 'PDF',
      ppt: '演示文稿',
      txt: '文本',
      unknown: '文件',
      video: '视频',
      word: '文档',
      zip: '压缩包',
    },
    status: {
      uploading: '上传中',
      failed: '上传失败',
      ready: '已就绪',
    },
    aria: {
      preview: (name: string) => `预览附件 ${name}`,
      download: (name: string) => `下载附件 ${name}`,
      remove: (name: string) => `移除文件 ${name}`,
    },
    validation: {
      fallbackAttachmentName: (index: number) => `附件${index + 1}`,
      imagePreviewReadFailed: '图片预览读取失败。',
      duplicateFile: (fileName: string) =>
        `以下文件已在待发送列表中，已自动跳过：${fileName}`,
      attachmentLimit: (maxCount: number, ignoredCount: number) =>
        `最多添加 ${maxCount} 份补充文件，超出的 ${ignoredCount} 份已忽略。`,
      oversizeFile: (maxFileSizeMb: number, fileName: string) =>
        `以下文件超过 ${maxFileSizeMb} MB，暂不支持上传：${fileName}`,
      wrapFileName: (fileName: string) => `《${fileName}》`,
      uploadFailed: (fileName: string) => `附件上传失败：${fileName}`,
    },
  },
  documentPreview: {
    attachmentPreview: '附件预览',
    unsupportedAttachmentPreview: '当前附件暂不支持内嵌预览。',
    downloadAttachment: '下载附件',
  },
  message: {
    thinkingInProgress: '思考中',
    thinkingProcess: '思考过程',
    toolActivity: '工具轨迹',
    toolCall: '调用',
    toolResult: '结果',
    toolCallCount: (count: number) => `${count} 次调用`,
    toolResultCount: (count: number) => `${count} 个结果`,
    runEcho: '执行回显',
    agentExecution: '智能体执行',
    running: '进行中',
    loadingOlder: '正在加载更早记录...',
  },
  runProgressEcho: {
    steps: {
      createModelSkeleton: '搭建模型骨架',
      factorMapping: '匹配因子',
      createDataRecords: '生成数据记录',
      setOutputProduct: '设置研究对象',
      done: '执行完成',
    },
    modelNodeTypes: {
      phases: '阶段',
      modules: '模块',
      unitProcesses: '单元过程',
    },
    metric: {
      nodes: (count: number) => `${count} 个节点`,
      matches: (count: number) => `${count} 条匹配`,
      records: (count: number) => `${count} 条记录`,
      results: (count: number) => `${count} 条结果`,
      completed: '已完成',
      productUpdated: '研究对象已更新',
    },
    description: {
      latestAdded: (name: string, type?: string) =>
        type ? `最近新增：${name} · ${type}` : `最近新增：${name}`,
      modelSkeletonReady: '已生成阶段、模块和单元过程骨架。',
      latestMatched: (unitProcessName: string, factorName?: string) =>
        factorName
          ? `最近匹配：${unitProcessName} -> ${factorName}`
          : `最近匹配：${unitProcessName}`,
      factorMappingReady: '已为当前模型补齐因子匹配结果。',
      latestGenerated: (recordName: string, amountLabel?: string) =>
        amountLabel
          ? `最近生成：${recordName} · ${amountLabel}`
          : `最近生成：${recordName}`,
      dataRecordsReady: '已生成本轮核算需要的数据记录。',
      outputProductCreated: '已新建研究对象并写入当前任务。',
      outputProductReused: '已复用研究对象并写入当前任务。',
      accountingResultReady: '执行结果已写入核算任务，可继续查看详情。',
      done: '本轮执行已完成并返回结果。',
      generic: '已返回可用于回显的执行结果。',
    },
    summary: (sectionCount: number, preview?: string) =>
      `${sectionCount} 个阶段${preview ? ` · ${preview}` : ''}`,
  },
  renderer: {
    newThread: '新会话',
    selectedArea: (count: number) =>
      count > 1 ? `当前选中区域 (${count})` : '当前选中区域',
    progressItemNames: {
      progressUpdate: '进度更新',
      toolCall: '工具调用',
      workflowRun: '工作流',
      workflowStep: '工作流步骤',
    },
    progressStatuses: {
      cancelled: '已取消',
      completed: '已完成',
      failed: '失败',
      queued: '排队中',
      running: '执行中',
    },
    progressUpdateFallback: '进度更新',
    sectionLabel: (sectionName?: string) =>
      sectionName ? `区块 · ${sectionName}` : '区块',
    updateCount: (count: number) => `${count} 条更新`,
    quickOptions: '快捷选项',
    cancelSelectedArea: '取消当前选中区域',
    noHistory: '暂无历史会话，发送第一条消息后会自动创建。',
    current: '当前',
    viewHistory: '查看历史会话',
    history: '历史会话',
    runProgress: '运行进度',
    closeSelection: '关闭选择',
    cancel: '取消',
    submitting: '提交中',
    submitted: '已提交',
    confirm: '确认',
    closeAssistant: '关闭助手',
    displayMode: '助手显示方式',
    displayModes: {
      sheet: '右侧抽屉',
      dialog: '独立弹框',
      embedded: '页面内嵌',
    },
    createThread: '新对话',
    loadingThreadTitle: '正在加载会话',
    loadingThreadDescription: '稍等一下，马上切到你选择的历史会话。',
    landingSubtitle: '搭建模型 / 补全活动数据 / 匹配排放因子',
    anchorPreview: (labels: Array<string>, hasMore: boolean) =>
      `${labels.join('、')}${hasMore ? ' 等' : ''}`,
  },
  collaboration: {
    receivedRequestTitle: '已收到协作请求',
    receivedRequestContent: (areaTitle: string) =>
      `我会围绕「${areaTitle}」继续分析。当前为页面级 mock 协作入口，后续可接入真实 Agent 工具流。`,
    collapseAssistant: '收起协作助手',
    pinToRight: '固定到右侧',
    floatAssistant: '悬浮显示',
    aiCollaboration: (label: string) => `AI 协作：${label}`,
    seed: {
      initializedTitle: '任务已初始化',
      initializedContent: (areaTitle: string) =>
        `已为「${areaTitle}」创建协作入口，等待智能体和业务方继续协作。`,
      completedTitle: '研究已完成',
      completedContent:
        '智能体已完成首轮研究，并生成可继续定点优化的工作台内容。',
    },
  },
  panel: {
    backToBottom: '回到底部',
    resizeHandleAriaLabel: '调整协作助手宽度',
  },
  agentDock: {
    openAriaLabel: '打开 AI 协作助手',
    expandAriaLabel: '展开 AI 协作助手',
    panelAriaLabel: 'AI 协作助手',
    closeAriaLabel: '关闭 AI 协作助手',
    resizeHandleAriaLabel: {
      bottom: '调整 AI 协作助手下边尺寸',
      bottomLeft: '调整 AI 协作助手左下角尺寸',
      bottomRight: '调整 AI 协作助手右下角尺寸',
      left: '调整 AI 协作助手左边尺寸',
      right: '调整 AI 协作助手右边尺寸',
      top: '调整 AI 协作助手上边尺寸',
      topLeft: '调整 AI 协作助手左上角尺寸',
      topRight: '调整 AI 协作助手右上角尺寸',
    },
  },
  contextRegion: {
    actionLabel: '修改',
    triggerTooltip: 'Ask 青钥助手',
  },
  errors: {
    missingOrganizationForUpload: '当前组织信息缺失，暂时无法上传附件。',
    missingUserForInit: '当前用户信息缺失，暂时无法初始化 AI 会话。',
    eventStreamFailed: '助手事件流订阅失败，请稍后重试。',
    runFailed: '运行失败',
    interactionTitle: '待确认项',
    pendingInteraction: '待确认事项',
    runProgressLoadFailed: '执行回显加载失败，请稍后重试。',
    collaborationRequestFailed: '协作请求失败，请稍后重试。',
    uploadFailed: '文件上传失败，请稍后重试。',
    missingUserContext: '当前用户上下文未准备完成，暂时无法发送消息。',
    activeRunInProgress: '当前会话仍在处理中，请稍后再发送。',
    newThreadCreateFailed: '新会话创建失败，请稍后重试。',
    messageSendFailed: '消息发送失败，请稍后重试。',
    interactionContextLost: '当前交互已失去运行上下文，请刷新会话后重试。',
    emptyMessage: '发送内容不能为空。',
    researchThreadCreateFailed: '研究线程创建失败，请稍后重试。',
  },
}

export type AssistantWorkbenchMessages = typeof assistantWorkbenchMessages
