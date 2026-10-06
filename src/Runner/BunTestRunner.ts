import type { Istanbun } from '@@types/Istanbun'
import type CoveragePlan from '@/Config/CoveragePlan'
import LcovWatcher from '@/Runner/LcovWatcher'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

type RunContext = {
  bunTestArguments: string[]
  lcovDirectory: string
  lcovPath: string
  usesTemporaryDirectory: boolean
  onLcovWritten: Istanbun.LcovListener
}

export default class BunTestRunner {
  private readonly workingDirectory: string
  private readonly plan: CoveragePlan
  private readonly watch: boolean
  private child: Bun.Subprocess | undefined = undefined

  /**
   * Create a runner.
   *
   * @param {string} workingDirectory Directory to run `bun test` in.
   * @param {CoveragePlan} plan Flags and lcov location.
   * @param {boolean} watch Whether to pass `--watch` and report after every rerun.
   *
   * @public
   */
  public static create(
    workingDirectory: string,
    plan: CoveragePlan,
    watch: boolean,
  ): BunTestRunner {
    return new BunTestRunner(workingDirectory, plan, watch)
  }

  /**
   * Store the run configuration.
   *
   * @param {string} workingDirectory Directory to run `bun test` in.
   * @param {CoveragePlan} plan Flags and lcov location.
   * @param {boolean} watch Whether to pass `--watch` and report after every rerun.
   *
   * @public
   */
  public constructor(workingDirectory: string, plan: CoveragePlan, watch: boolean) {
    this.workingDirectory = workingDirectory
    this.plan = plan
    this.watch = watch
  }

  /**
   * Run `bun test` and hand every written lcov.info to the listener. Resolves with the exit code.
   * A SIGINT handler keeps istanbun alive until `bun test` has exited, so the temporary
   * directory is always cleaned up.
   *
   * @param {string[]} bunTestArguments Extra arguments for `bun test`.
   * @param {Istanbun.LcovListener} onLcovWritten Receives the lcov path after each run.
   *
   * @public
   */
  public async run(
    bunTestArguments: string[],
    onLcovWritten: Istanbun.LcovListener,
  ): Promise<number> {
    const usesTemporaryDirectory: boolean = this.plan.lcovDirectory === undefined
    const lcovDirectory: string = await this.resolveLcovDirectory()
    const context: RunContext = {
      bunTestArguments,
      lcovDirectory,
      lcovPath: join(lcovDirectory, 'lcov.info'),
      usesTemporaryDirectory,
      onLcovWritten,
    }
    const forwardInterrupt = (): void => {
      this.child?.kill('SIGINT')
    }
    process.on('SIGINT', forwardInterrupt)

    try {
      if (this.watch === true) {
        return await this.runWatching(context)
      }

      return await this.runOnce(context)
    } finally {
      process.off('SIGINT', forwardInterrupt)
      if (usesTemporaryDirectory === true) {
        await rm(lcovDirectory, { recursive: true, force: true })
      }
    }
  }

  /**
   * Use bunfig's coverageDir when set (Bun ignores --coverage-dir then), else a temporary
   * directory. The coverageDir is created up front because the watcher needs it to exist.
   *
   * @private
   */
  private async resolveLcovDirectory(): Promise<string> {
    if (this.plan.lcovDirectory !== undefined) {
      const lcovDirectory: string = resolve(this.workingDirectory, this.plan.lcovDirectory)
      await mkdir(lcovDirectory, { recursive: true })

      return lcovDirectory
    }

    return mkdtemp(join(tmpdir(), 'istanbun-'))
  }

  /**
   * Single run: wait for exit, then report once. Bun writes no lcov.info when the run loaded no
   * source file (only test files, a filter without matches, a syntax error); that is reported as
   * a notice, not an error, so bun test's exit code still decides the outcome.
   *
   * @param {RunContext} context Paths and listener for this run.
   *
   * @private
   */
  private async runOnce(context: RunContext): Promise<number> {
    const exitCode: number = await this.spawn(context.bunTestArguments, context).exited

    if (existsSync(context.lcovPath) === false) {
      process.stderr.write(
        'istanbun: bun test loaded no source files, so no reports were written\n',
      )

      return exitCode
    }

    await context.onLcovWritten(context.lcovPath)

    return exitCode
  }

  /**
   * Watch run: report after every rewrite of lcov.info until bun test exits (Ctrl-C).
   *
   * @param {RunContext} context Paths and listener for this run.
   *
   * @private
   */
  private async runWatching(context: RunContext): Promise<number> {
    const watcher: LcovWatcher = LcovWatcher.create(context.lcovDirectory, context.onLcovWritten)
    watcher.start()

    try {
      const exitCode: number = await this.spawn([...context.bunTestArguments, '--watch'], context)
        .exited
      const wasPending: boolean = watcher.stop()
      if (wasPending === true && existsSync(context.lcovPath) === true) {
        await context.onLcovWritten(context.lcovPath)
      }

      return exitCode
    } finally {
      watcher.stop()
    }
  }

  /**
   * Spawn `bun test` with inherited stdio so the normal test output stays visible.
   *
   * @param {string[]} bunTestArguments Arguments after the coverage flags.
   * @param {RunContext} context Provides the lcov directory and whether it is temporary.
   *
   * @private
   */
  private spawn(bunTestArguments: string[], context: RunContext): Bun.Subprocess {
    const command: string[] = ['bun', 'test', ...this.plan.bunTestFlags]
    if (context.usesTemporaryDirectory === true) {
      command.push(`--coverage-dir=${context.lcovDirectory}`)
    }
    command.push(...bunTestArguments)

    this.child = Bun.spawn(command, {
      cwd: this.workingDirectory,
      stdio: ['inherit', 'inherit', 'inherit'],
    })

    return this.child
  }
}
