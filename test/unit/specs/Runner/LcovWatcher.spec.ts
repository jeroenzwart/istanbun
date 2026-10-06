import LcovWatcher from '@/Runner/LcovWatcher'
import TemporaryDirectory from '#test/helpers/TemporaryDirectory'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { join } from 'node:path'

// Longer than the watcher's 100 ms debounce plus file-system event latency.
const SETTLE_MILLISECONDS: number = 300

describe('@/Runner/LcovWatcher', (): void => {
  let directory: TemporaryDirectory
  let watcher: LcovWatcher
  let reportedPaths: string[]

  beforeEach((): void => {
    directory = TemporaryDirectory.create()
    reportedPaths = []
    watcher = LcovWatcher.create(directory.path, async (lcovPath: string): Promise<void> => {
      reportedPaths.push(lcovPath)
    })
    watcher.start()
  })

  afterEach((): void => {
    watcher.stop()
    directory.remove()
  })

  it('should report once for a burst of lcov.info writes', async (): Promise<void> => {
    // Act
    directory.write('lcov.info', 'first')
    directory.write('lcov.info', 'second')
    await Bun.sleep(SETTLE_MILLISECONDS)

    // Assert
    expect(reportedPaths).toEqual([join(directory.path, 'lcov.info')])
  })

  it('should ignore other files in the directory', async (): Promise<void> => {
    // Act
    directory.write('coverage-final.json', '{}')
    await Bun.sleep(SETTLE_MILLISECONDS)

    // Assert
    expect(reportedPaths).toEqual([])
  })

  it('should tell whether a report was still pending when stopped', async (): Promise<void> => {
    // Act
    directory.write('lcov.info', 'content')
    await Bun.sleep(50)
    const wasPending: boolean = watcher.stop()
    await Bun.sleep(SETTLE_MILLISECONDS)

    // Assert
    expect(wasPending).toBe(true)
    expect(reportedPaths).toEqual([])
    expect(watcher.stop()).toBe(false)
  })
})
