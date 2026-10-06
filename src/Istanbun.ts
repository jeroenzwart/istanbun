import type { Istanbun as IstanbunTypes } from '@@types/Istanbun'
import { bunfigReader } from '@/Config/BunfigReader'
import CoveragePlan from '@/Config/CoveragePlan'
import { coverageMapFactory } from '@/Coverage/CoverageMapFactory'
import IstanbunError from '@/Errors/IstanbunError'
import { lcovParser } from '@/Lcov/LcovParser'
import IstanbulReportWriter from '@/Report/IstanbulReportWriter'
import BunTestRunner from '@/Runner/BunTestRunner'
import { createCoverageMap, type CoverageMap } from 'istanbul-lib-coverage'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

export default class Istanbun {
  private readonly options: IstanbunTypes.Options
  private readonly workingDirectory: string
  private readonly plan: CoveragePlan
  private readonly reportWriter: IstanbulReportWriter
  private lastLcovContent: string | undefined = undefined
  private lastCoverageMap: CoverageMap = createCoverageMap({})

  /**
   * Create an istanbun instance. Reads bunfig.toml and validates the configuration, so every
   * configuration error surfaces before `bun test` starts.
   *
   * @param {IstanbunTypes.Options} options Options; unset values fall back to bunfig.toml.
   *
   * @throws {IstanbunError} Any configuration error (see IstanbunErrorCode).
   *
   * @public
   */
  public static create(options: IstanbunTypes.Options = {}): Istanbun {
    const workingDirectory: string = resolve(options.workingDirectory ?? process.cwd())
    const plan: CoveragePlan = CoveragePlan.create(bunfigReader.read(workingDirectory), options)

    return new Istanbun(options, workingDirectory, plan)
  }

  /**
   * Validate the option combination and the reporter names.
   *
   * @param {IstanbunTypes.Options} options The caller's options.
   * @param {string} workingDirectory Absolute working directory.
   * @param {CoveragePlan} plan The resolved plan.
   *
   * @throws {IstanbunError} WATCH_WITH_LCOV_FILE when both watch and lcovPath are set.
   * @throws {IstanbunError} UNKNOWN_REPORTER
   *
   * @public
   */
  public constructor(options: IstanbunTypes.Options, workingDirectory: string, plan: CoveragePlan) {
    if (options.watch === true && options.lcovPath !== undefined) {
      throw new IstanbunError(
        'WATCH_WITH_LCOV_FILE',
        'Watch mode cannot be combined with an existing lcov file',
      )
    }

    this.options = options
    this.workingDirectory = workingDirectory
    this.plan = plan
    this.reportWriter = IstanbulReportWriter.create(resolve(workingDirectory, plan.outputDirectory))
    this.reportWriter.validate(plan.reporters)
  }

  /**
   * Run `bun test` (or convert the given lcov file) and write the reports. The coverage map in
   * the result is empty when `bun test` was interrupted before it wrote any coverage.
   *
   * @throws {IstanbunError} LCOV_FILE_NOT_FOUND, LCOV_NOT_GENERATED, INVALID_LCOV
   *
   * @public
   */
  public async run(): Promise<IstanbunTypes.Result> {
    if (this.options.lcovPath !== undefined) {
      await this.report(this.resolveLcovFile(this.options.lcovPath))

      return { exitCode: 0, coverageMap: this.lastCoverageMap }
    }

    const runner: BunTestRunner = BunTestRunner.create(
      this.workingDirectory,
      this.plan,
      this.options.watch === true,
    )
    const exitCode: number = await runner.run(
      this.options.bunTestArguments ?? [],
      (lcovPath: string): Promise<void> => this.report(lcovPath),
    )

    return { exitCode, coverageMap: this.lastCoverageMap }
  }

  /**
   * Resolve a user-supplied lcov path and make sure it exists.
   *
   * @param {string} lcovPath The path from the options.
   *
   * @throws {IstanbunError} LCOV_FILE_NOT_FOUND
   *
   * @private
   */
  private resolveLcovFile(lcovPath: string): string {
    const resolved: string = resolve(this.workingDirectory, lcovPath)
    if (existsSync(resolved) === false) {
      throw new IstanbunError('LCOV_FILE_NOT_FOUND', `lcov file not found: ${resolved}`)
    }

    return resolved
  }

  /**
   * One report cycle: read → parse → map → write → notify. Skipped when the file content did
   * not change: the `lcov` and `lcovonly` reporters write lcov.info into the output directory,
   * which may be the directory the watcher is watching, so this guard stops that feedback loop.
   *
   * @param {string} lcovPath Absolute path to lcov.info.
   *
   * @private
   */
  private async report(lcovPath: string): Promise<void> {
    const content: string = await Bun.file(lcovPath).text()
    if (content === this.lastLcovContent) {
      return
    }

    const coverageMap: CoverageMap = coverageMapFactory.create(
      lcovParser.parse(content),
      this.workingDirectory,
    )
    this.reportWriter.write(coverageMap, this.plan.reporters)
    this.lastLcovContent = content
    this.lastCoverageMap = coverageMap
    this.options.onReport?.(coverageMap)
  }
}
