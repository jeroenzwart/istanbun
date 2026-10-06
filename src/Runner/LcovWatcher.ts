import type { Istanbun } from '@@types/Istanbun'
import { watch, type FSWatcher } from 'node:fs'
import { join } from 'node:path'

const LCOV_FILE_NAME: string = 'lcov.info'
const DEBOUNCE_MILLISECONDS: number = 100

export default class LcovWatcher {
  private readonly directory: string
  private readonly onLcovWritten: Istanbun.LcovListener
  private watcher: FSWatcher | undefined = undefined
  private timer: ReturnType<typeof setTimeout> | undefined = undefined

  /**
   * Watch a directory for rewrites of lcov.info.
   *
   * @param {string} directory The directory Bun writes lcov.info into.
   * @param {Istanbun.LcovListener} onLcovWritten Called, debounced, after each rewrite.
   *
   * @public
   */
  public static create(directory: string, onLcovWritten: Istanbun.LcovListener): LcovWatcher {
    return new LcovWatcher(directory, onLcovWritten)
  }

  /**
   * Store the directory and listener.
   *
   * @param {string} directory The directory Bun writes lcov.info into.
   * @param {Istanbun.LcovListener} onLcovWritten Called, debounced, after each rewrite.
   *
   * @public
   */
  public constructor(directory: string, onLcovWritten: Istanbun.LcovListener) {
    this.directory = directory
    this.onLcovWritten = onLcovWritten
  }

  /**
   * Start watching. Bun writes `.lcov.info.<hash>.tmp` and renames it, which fires two
   * `rename` events for lcov.info per run; the debounce collapses them.
   *
   * @public
   */
  public start(): void {
    this.watcher = watch(this.directory, (_event: string, fileName: string | null): void => {
      if (fileName !== LCOV_FILE_NAME) {
        return
      }
      this.schedule()
    })
  }

  /**
   * Stop watching. Returns true when a debounced report was still pending.
   *
   * @public
   */
  public stop(): boolean {
    this.watcher?.close()
    this.watcher = undefined

    const wasPending: boolean = this.timer !== undefined
    if (this.timer !== undefined) {
      clearTimeout(this.timer)
      this.timer = undefined
    }

    return wasPending
  }

  /**
   * (Re)start the debounce timer.
   *
   * @private
   */
  private schedule(): void {
    if (this.timer !== undefined) {
      clearTimeout(this.timer)
    }
    this.timer = setTimeout((): void => {
      this.timer = undefined
      // ponytail: reports take milliseconds and reruns take longer, so overlapping cycles are not serialised.
      void this.onLcovWritten(join(this.directory, LCOV_FILE_NAME)).catch(
        (error: unknown): void => {
          const message: string = error instanceof Error ? error.message : String(error)
          process.stderr.write(`istanbun: ${message}\n`)
        },
      )
    }, DEBOUNCE_MILLISECONDS)
  }
}
