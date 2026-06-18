export class UploadAbortError extends Error {
  constructor(message = '已取消上传') {
    super(message)
    this.name = 'UploadAbortError'
  }
}

export interface UploadTaskExecution<TResult> {
  promise: Promise<TResult>
  abort: () => void
}

export interface UploadPoolTask<TResult> {
  id: string
  start: () => UploadTaskExecution<TResult>
  onQueued?: () => void
  onStart?: () => void
  onSuccess?: (result: TResult) => void
  onError?: (error: Error) => void
  onAbort?: (error: UploadAbortError) => void
}

export interface UploadPool {
  enqueue: <TResult>(task: UploadPoolTask<TResult>) => Promise<TResult>
  abort: (taskId: string) => boolean
  abortAll: () => void
  destroy: () => void
  getSnapshot: () => {
    activeCount: number
    queuedCount: number
  }
}

interface UploadPoolTaskRecord {
  id: string
  task: UploadPoolTask<unknown>
  state: 'queued' | 'running' | 'settled'
  abortRequested: boolean
  executionAbort?: () => void
  resolve: (value: unknown) => void
  reject: (reason?: unknown) => void
  settled: boolean
}

function normalizeUploadError(error: unknown) {
  if (error instanceof Error) {
    return error
  }

  return new Error('上传失败，请稍后重试。')
}

export function createUploadPool(
  options: {
    concurrency?: number
  } = {},
): UploadPool {
  const concurrency = Math.max(1, options.concurrency ?? 5)
  const taskMap = new Map<string, UploadPoolTaskRecord>()
  const queuedTasks: Array<UploadPoolTaskRecord> = []
  let activeCount = 0

  const removeQueuedTask = (taskId: string) => {
    const index = queuedTasks.findIndex((item) => item.id === taskId)

    if (index >= 0) {
      queuedTasks.splice(index, 1)
    }
  }

  const settleTask = (record: UploadPoolTaskRecord, handler: () => void) => {
    if (record.settled) {
      return
    }

    record.settled = true

    if (record.state === 'running') {
      activeCount = Math.max(0, activeCount - 1)
    }

    record.state = 'settled'
    taskMap.delete(record.id)
    handler()
    schedule()
  }

  const schedule = () => {
    while (activeCount < concurrency && queuedTasks.length > 0) {
      const record = queuedTasks.shift() as UploadPoolTaskRecord

      if (record.settled) {
        continue
      }

      record.state = 'running'
      activeCount += 1
      record.task.onStart?.()

      let execution: UploadTaskExecution<unknown>

      try {
        execution = record.task.start()
      } catch (error) {
        const normalizedError = normalizeUploadError(error)

        settleTask(record, () => {
          record.task.onError?.(normalizedError)
          record.reject(normalizedError)
        })
        continue
      }

      record.executionAbort = execution.abort

      execution.promise.then(
        (result) => {
          settleTask(record, () => {
            record.task.onSuccess?.(result)
            record.resolve(result)
          })
        },
        (error) => {
          if (record.abortRequested) {
            const abortError =
              error instanceof UploadAbortError ? error : new UploadAbortError()

            settleTask(record, () => {
              record.task.onAbort?.(abortError)
              record.reject(abortError)
            })
            return
          }

          const normalizedError = normalizeUploadError(error)

          settleTask(record, () => {
            record.task.onError?.(normalizedError)
            record.reject(normalizedError)
          })
        },
      )
    }
  }

  const abort = (taskId: string) => {
    const record = taskMap.get(taskId)

    if (!record || record.settled) {
      return false
    }

    record.abortRequested = true

    if (record.state === 'queued') {
      removeQueuedTask(taskId)

      settleTask(record, () => {
        const abortError = new UploadAbortError()

        record.task.onAbort?.(abortError)
        record.reject(abortError)
      })
      return true
    }

    record.executionAbort?.()
    return true
  }

  const abortAll = () => {
    Array.from(taskMap.keys()).forEach((taskId) => {
      abort(taskId)
    })
  }

  return {
    enqueue: <TResult>(task: UploadPoolTask<TResult>) => {
      if (taskMap.has(task.id)) {
        return Promise.reject(new Error(`上传任务已存在：${task.id}`))
      }

      return new Promise((resolve, reject) => {
        const record: UploadPoolTaskRecord = {
          id: task.id,
          task: task as UploadPoolTask<unknown>,
          state: 'queued',
          abortRequested: false,
          resolve: resolve as (value: unknown) => void,
          reject,
          settled: false,
        }

        taskMap.set(task.id, record)
        queuedTasks.push(record)
        task.onQueued?.()
        schedule()
      })
    },

    abort,

    abortAll,

    destroy() {
      abortAll()
    },

    getSnapshot() {
      return {
        activeCount,
        queuedCount: queuedTasks.length,
      }
    },
  }
}
