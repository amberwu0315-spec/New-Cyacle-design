import type { AssistantWorkbenchMessages } from '../zh-CN/assistant-workbench'

export const assistantWorkbenchMessages: AssistantWorkbenchMessages = {
  brand: {
    ai: 'AI',
    assistantName: 'Cyacle',
    panelTitle: 'Collaboration Assistant',
    panelAriaLabel: 'AI Collaboration Assistant',
    sheetPanelDescription: 'Right-side collaboration assistant panel.',
    dialogPanelDescription: 'Standalone collaboration assistant dialog.',
    entryLabel: 'AI',
    entryTooltip: 'Cyacle',
  },
  composer: {
    placeholder: {
      docked: 'Describe your idea',
      landing: 'Ask a question, or describe how AI can help',
    },
    stopGenerating: 'Stop generating',
    send: 'Send',
    currentTargetArea: (title) => `Current target area: ${title}`,
    clearCurrentArea: 'Clear current area',
    addSupplementFiles: 'Add supporting files',
    uploadMaterials: 'Upload materials',
    attachmentLimitHint: (maxCount, maxFileSizeMb) =>
      `Add up to ${maxCount} materials. Each file must be no larger than ${maxFileSizeMb} MB.`,
    defaultAttachmentOnlyPrompt:
      'Please continue the analysis using the files I uploaded.',
  },
  attachments: {
    unnamedFile: 'Unnamed file',
    fileKinds: {
      excel: 'Spreadsheet',
      folder: 'Folder',
      image: 'Image',
      keynote: 'Keynote',
      pdf: 'PDF',
      ppt: 'Presentation',
      txt: 'Text',
      unknown: 'File',
      video: 'Video',
      word: 'Document',
      zip: 'Archive',
    },
    status: {
      uploading: 'Uploading',
      failed: 'Upload failed',
      ready: 'Ready',
    },
    aria: {
      preview: (name) => `Preview attachment ${name}`,
      download: (name) => `Download attachment ${name}`,
      remove: (name) => `Remove file ${name}`,
    },
    validation: {
      fallbackAttachmentName: (index) => `Attachment ${index + 1}`,
      imagePreviewReadFailed: 'Failed to read image preview.',
      duplicateFile: (fileName) =>
        `The following file is already in the send list and was skipped automatically: ${fileName}`,
      attachmentLimit: (maxCount, ignoredCount) =>
        `Add up to ${maxCount} supporting files. ${ignoredCount} extra file was ignored.`,
      oversizeFile: (maxFileSizeMb, fileName) =>
        `The following file is larger than ${maxFileSizeMb} MB and cannot be uploaded: ${fileName}`,
      wrapFileName: (fileName) => `"${fileName}"`,
      uploadFailed: (fileName) => `Attachment upload failed: ${fileName}`,
    },
  },
  documentPreview: {
    attachmentPreview: 'Attachment Preview',
    unsupportedAttachmentPreview:
      'Inline preview is not available for this attachment.',
    downloadAttachment: 'Download Attachment',
  },
  message: {
    thinkingInProgress: 'Thinking',
    thinkingProcess: 'Thinking process',
    toolActivity: 'Tool activity',
    toolCall: 'Call',
    toolResult: 'Result',
    toolCallCount: (count) => `${count} call${count === 1 ? '' : 's'}`,
    toolResultCount: (count) => `${count} result${count === 1 ? '' : 's'}`,
    runEcho: 'Execution echo',
    agentExecution: 'Agent execution',
    running: 'Running',
    loadingOlder: 'Loading earlier records...',
  },
  runProgressEcho: {
    steps: {
      createModelSkeleton: 'Build model skeleton',
      factorMapping: 'Match factors',
      createDataRecords: 'Generate data records',
      setOutputProduct: 'Set research object',
      done: 'Execution complete',
    },
    modelNodeTypes: {
      phases: 'Phase',
      modules: 'Module',
      unitProcesses: 'Unit process',
    },
    metric: {
      nodes: (count) => `${count} node${count === 1 ? '' : 's'}`,
      matches: (count) => `${count} match${count === 1 ? '' : 'es'}`,
      records: (count) => `${count} record${count === 1 ? '' : 's'}`,
      results: (count) => `${count} result${count === 1 ? '' : 's'}`,
      completed: 'Completed',
      productUpdated: 'Research object updated',
    },
    description: {
      latestAdded: (name, type) =>
        type ? `Latest added: ${name} · ${type}` : `Latest added: ${name}`,
      modelSkeletonReady:
        'The phase, module, and unit process skeleton is ready.',
      latestMatched: (unitProcessName, factorName) =>
        factorName
          ? `Latest match: ${unitProcessName} -> ${factorName}`
          : `Latest match: ${unitProcessName}`,
      factorMappingReady:
        'Factor matching has been completed for the current model.',
      latestGenerated: (recordName, amountLabel) =>
        amountLabel
          ? `Latest generated: ${recordName} · ${amountLabel}`
          : `Latest generated: ${recordName}`,
      dataRecordsReady:
        'Data records required for this accounting run have been generated.',
      outputProductCreated:
        'A new research object has been created and written to the current task.',
      outputProductReused:
        'An existing research object has been reused and written to the current task.',
      accountingResultReady:
        'Execution results have been written to the accounting task. You can continue in details.',
      done: 'This execution has completed and returned results.',
      generic: 'Execution results are available for echo display.',
    },
    summary: (sectionCount, preview) =>
      `${sectionCount} stage${sectionCount === 1 ? '' : 's'}${preview ? ` · ${preview}` : ''}`,
  },
  renderer: {
    newThread: 'New conversation',
    selectedArea: (count) =>
      count > 1 ? `Current selected areas (${count})` : 'Current selected area',
    progressItemNames: {
      progressUpdate: 'Progress update',
      toolCall: 'Tool call',
      workflowRun: 'Workflow',
      workflowStep: 'Workflow step',
    },
    progressStatuses: {
      cancelled: 'Cancelled',
      completed: 'Completed',
      failed: 'Failed',
      queued: 'Queued',
      running: 'Running',
    },
    progressUpdateFallback: 'Progress update',
    sectionLabel: (sectionName) =>
      sectionName ? `Section · ${sectionName}` : 'Section',
    updateCount: (count) => `${count} update${count === 1 ? '' : 's'}`,
    quickOptions: 'Quick options',
    cancelSelectedArea: 'Cancel current selected area',
    noHistory:
      'No conversation history yet. Send the first message to create one automatically.',
    current: 'Current',
    viewHistory: 'View conversation history',
    history: 'Conversation history',
    runProgress: 'Run progress',
    closeSelection: 'Close selection',
    cancel: 'Cancel',
    submitting: 'Submitting',
    submitted: 'Submitted',
    confirm: 'Confirm',
    closeAssistant: 'Close assistant',
    displayMode: 'Assistant display mode',
    displayModes: {
      sheet: 'Right drawer',
      dialog: 'Dialog',
      embedded: 'Embedded',
    },
    createThread: 'New chat',
    loadingThreadTitle: 'Loading conversation',
    loadingThreadDescription:
      'One moment. Switching to the selected historical conversation.',
    landingSubtitle:
      'Build models / Complete activity data / Match emission factors',
    anchorPreview: (labels, hasMore) =>
      `${labels.join(', ')}${hasMore ? ', etc.' : ''}`,
  },
  collaboration: {
    receivedRequestTitle: 'Collaboration request received',
    receivedRequestContent: (areaTitle) =>
      `I will continue analyzing around "${areaTitle}". This is currently a page-level mock collaboration entry and can later be connected to the real Agent tool flow.`,
    collapseAssistant: 'Collapse collaboration assistant',
    pinToRight: 'Pin to right side',
    floatAssistant: 'Float assistant',
    aiCollaboration: (label) => `AI collaboration: ${label}`,
    seed: {
      initializedTitle: 'Task initialized',
      initializedContent: (areaTitle) =>
        `A collaboration entry has been created for "${areaTitle}". Waiting for the agent and business users to continue collaborating.`,
      completedTitle: 'Research completed',
      completedContent:
        'The agent has completed the first round of research and generated workbench content for targeted follow-up optimization.',
    },
  },
  panel: {
    backToBottom: 'Back to bottom',
    resizeHandleAriaLabel: 'Resize collaboration assistant width',
  },
  agentDock: {
    openAriaLabel: 'Open AI collaboration assistant',
    expandAriaLabel: 'Expand AI collaboration assistant',
    panelAriaLabel: 'AI Collaboration Assistant',
    closeAriaLabel: 'Close AI collaboration assistant',
    resizeHandleAriaLabel: {
      bottom: 'Resize the bottom edge of the AI collaboration assistant',
      bottomLeft:
        'Resize the bottom-left corner of the AI collaboration assistant',
      bottomRight:
        'Resize the bottom-right corner of the AI collaboration assistant',
      left: 'Resize the left edge of the AI collaboration assistant',
      right: 'Resize the right edge of the AI collaboration assistant',
      top: 'Resize the top edge of the AI collaboration assistant',
      topLeft: 'Resize the top-left corner of the AI collaboration assistant',
      topRight: 'Resize the top-right corner of the AI collaboration assistant',
    },
  },
  contextRegion: {
    actionLabel: 'Edit',
    triggerTooltip: 'Ask Cyacle',
  },
  errors: {
    missingOrganizationForUpload:
      'Organization information is missing. Attachments cannot be uploaded for now.',
    missingUserForInit:
      'User information is missing. Unable to initialize the AI session for now.',
    eventStreamFailed:
      'Failed to subscribe to the assistant event stream. Please try again later.',
    runFailed: 'Run failed',
    interactionTitle: 'Pending confirmation item',
    pendingInteraction: 'Pending confirmations',
    runProgressLoadFailed:
      'Failed to load execution echo. Please try again later.',
    collaborationRequestFailed:
      'Collaboration request failed. Please try again later.',
    uploadFailed: 'File upload failed. Please try again later.',
    missingUserContext:
      'User context is not ready yet. Unable to send the message for now.',
    activeRunInProgress:
      'The current conversation is still processing. Please send again later.',
    newThreadCreateFailed:
      'Failed to create a new conversation. Please try again later.',
    messageSendFailed: 'Failed to send message. Please try again later.',
    interactionContextLost:
      'The current interaction has lost its run context. Refresh the conversation and try again.',
    emptyMessage: 'Message content cannot be empty.',
    researchThreadCreateFailed:
      'Failed to create the research thread. Please try again later.',
  },
}
