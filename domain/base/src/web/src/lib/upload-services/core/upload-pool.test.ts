import { describe, expect, it, vi } from 'vitest'

import { UploadAbortError, createUploadPool } from './upload-pool'

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void

  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve
    reject = nextReject
  })

  return {
    promise,
    resolve,
    reject,
  }
}

describe('createUploadPool', () => {
  it('limits concurrent uploads and starts queued tasks when slots free up', async () => {
    const pool = createUploadPool({ concurrency: 2 })
    let activeCount = 0
    let maxActiveCount = 0

    const deferredList = Array.from({ length: 5 }, () =>
      createDeferred<string>(),
    )
    const taskPromises = deferredList.map((deferred, index) =>
      pool.enqueue({
        id: `task-${index}`,
        start: () => {
          activeCount += 1
          maxActiveCount = Math.max(maxActiveCount, activeCount)

          return {
            promise: deferred.promise.finally(() => {
              activeCount -= 1
            }),
            abort: () => {
              deferred.reject(new UploadAbortError())
            },
          }
        },
      }),
    )

    expect(pool.getSnapshot()).toEqual({ activeCount: 2, queuedCount: 3 })
    expect(maxActiveCount).toBe(2)

    deferredList[0]?.resolve('task-0')
    await expect(taskPromises[0]).resolves.toBe('task-0')

    expect(pool.getSnapshot()).toEqual({ activeCount: 2, queuedCount: 2 })

    deferredList.slice(1).forEach((deferred, index) => {
      deferred.resolve(`task-${index + 1}`)
    })

    await expect(Promise.all(taskPromises)).resolves.toEqual([
      'task-0',
      'task-1',
      'task-2',
      'task-3',
      'task-4',
    ])
    expect(pool.getSnapshot()).toEqual({ activeCount: 0, queuedCount: 0 })
  })

  it('can abort a queued upload before it starts', async () => {
    const pool = createUploadPool({ concurrency: 1 })
    const runningDeferred = createDeferred<string>()
    const queuedStart = vi.fn()

    const runningPromise = pool.enqueue({
      id: 'running-task',
      start: () => ({
        promise: runningDeferred.promise,
        abort: () => {
          runningDeferred.reject(new UploadAbortError())
        },
      }),
    })

    const queuedPromise = pool.enqueue({
      id: 'queued-task',
      start: () => {
        queuedStart()
        return {
          promise: Promise.resolve('queued-task'),
          abort: () => undefined,
        }
      },
    })

    expect(pool.getSnapshot()).toEqual({ activeCount: 1, queuedCount: 1 })
    expect(pool.abort('queued-task')).toBe(true)

    await expect(queuedPromise).rejects.toBeInstanceOf(UploadAbortError)
    expect(queuedStart).not.toHaveBeenCalled()

    runningDeferred.resolve('running-task')
    await expect(runningPromise).resolves.toBe('running-task')
    expect(pool.getSnapshot()).toEqual({ activeCount: 0, queuedCount: 0 })
  })
})
